import type { Transaction } from 'dexie';
import { systemClock } from '@/core/clock';
import { fail, ok, type Result } from '@/core/errors';
import { buildConflict, isStaleWrite } from '@/core/rules/sync-conflict';
import { pullChanges, type PullChange, type PullResponse } from './cloud/sync';
import { db, LOCAL_OWNER_ID } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { getDeviceId, markDeviceSynced } from './devices';
import { writeEvent } from './events';
import { createPullLoop } from './sync-pull-loop';
import type { OutboxOp, OwnerId, SyncConflict } from './types';

/**
 * 入站同步（PRD V2-02，方案 B：游标轮询）。
 *
 * 只应用游标之后的变更；本机有未提交改动且服务端版本已前进时，
 * 沿用补推的过期判定：记 `conflicts`、留 `sync.conflict`，并采用服务端版本。
 * 轮询失败只退避，不丢游标。
 */

const CURSOR_STORAGE_KEY = 'committodo.sync.pullCursor';

const TABLE_OF_ENTITY: Record<string, string> = {
  branch: 'branches',
  task: 'tasks',
  commit: 'commits',
  milestone: 'milestones',
  badge: 'badges',
};

interface StoredCursor {
  ownerId: string;
  cursor: string;
}

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readPullCursor(ownerId: string): string | null {
  try {
    const raw = storage()?.getItem(CURSOR_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredCursor>;
    if (parsed.ownerId !== ownerId || typeof parsed.cursor !== 'string') return null;
    return parsed.cursor;
  } catch {
    return null;
  }
}

export function writePullCursor(ownerId: string, cursor: string | null): void {
  if (cursor === null) return;
  try {
    const value: StoredCursor = { ownerId, cursor };
    storage()?.setItem(CURSOR_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // 存储不可用时只影响续传位置，下次从零拉取仍幂等。
  }
}

function revOf(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function branchIdOf(
  entity: string,
  entityId: string,
  payload: Record<string, unknown>,
  server: Record<string, unknown>,
): string | null {
  if (typeof payload.branchId === 'string') return payload.branchId;
  if (typeof server.branchId === 'string') return server.branchId;
  // 分支自身的冲突没有 branchId 字段，落回分支 id，历程才能定位到泳道。
  return entity === 'branch' ? entityId : null;
}

async function pendingForEntity(tx: Transaction, entityId: string): Promise<OutboxOp[]> {
  return tx
    .table<OutboxOp, string>('outbox')
    .filter((op) => op.entityId === entityId)
    .toArray();
}

/**
 * 应用一页入站变更；同一页重复应用是幂等的。
 * 本设备写入的行直接跳过（服务端已按设备过滤，这里再做一层兜底）。
 */
export async function applyPullChanges(
  changes: readonly PullChange[],
  deviceId: string = getDeviceId(),
  deps: WriteDeps = defaultWriteDeps,
): Promise<{ applied: number; conflicts: number; skipped: number }> {
  let applied = 0;
  let conflicts = 0;
  let skipped = 0;

  await db.transaction(
    'rw',
    [
      db.branches,
      db.tasks,
      db.commits,
      db.milestones,
      db.badges,
      db.outbox,
      db.conflicts,
      db.events,
    ],
    async (tx) => {
      for (const change of changes) {
        const tableName = TABLE_OF_ENTITY[change.entity];
        if (!tableName) {
          skipped += 1;
          continue;
        }
        const id = typeof change.row.id === 'string' ? change.row.id : '';
        if (id.length === 0) {
          skipped += 1;
          continue;
        }
        const row: Record<string, unknown> = { ...change.row, id };
        delete row._id;
        if (deviceId.length > 0 && String(row.lastDeviceId ?? '') === deviceId) {
          skipped += 1;
          continue;
        }

        const table = tx.table<Record<string, unknown>, string>(tableName);
        const local = await table.get(id);
        const serverRev = revOf(row.rev);
        const pendingRows = await pendingForEntity(tx, id);
        const pending =
          pendingRows.length === 0
            ? null
            : pendingRows.reduce((latest, row) =>
                row.createdAt > latest.createdAt ? row : latest,
              );

        if (pending === null) {
          const localRev = revOf(local?.rev) ?? 0;
          if (local && (serverRev ?? 0) <= localRev) {
            skipped += 1;
            continue;
          }
          await table.put(row);
          applied += 1;
          continue;
        }

        // 本机有未提交改动：只有服务端版本已前进才构成冲突；否则保留本地待推送版本。
        if (!isStaleWrite(pending.baseRev, serverRev)) {
          skipped += 1;
          continue;
        }

        const at = deps.clock.now();
        const localRev = revOf(pending.payload.rev);
        const branchId = branchIdOf(change.entity, id, pending.payload, row);
        const deviceIdOfConflict = deviceId.length > 0 ? deviceId : null;
        const conflict: SyncConflict = {
          id: deps.ids.ulid(at),
          ownerId:
            typeof pending.payload.ownerId === 'string'
              ? (pending.payload.ownerId as OwnerId)
              : LOCAL_OWNER_ID,
          ...buildConflict({
            entity: change.entity,
            entityId: id,
            branchId,
            field: null,
            localPayload: pending.payload,
            serverPayload: row,
            deviceId: deviceIdOfConflict,
            localRev,
            serverRev,
            at,
          }),
        };
        await tx.table<SyncConflict, string>('conflicts').add(conflict);

        // 采用服务端版本，并清掉该实体的待推送行，避免稍后用旧版本覆盖服务端。
        await table.put(row);
        await tx.table<OutboxOp, string>('outbox').bulkDelete(pendingRows.map((op) => op.opId));

        await writeEvent(
          tx,
          'sync.conflict',
          id,
          {
            branchId: branchId ?? '',
            entityId: id,
            field: '',
            entity: change.entity,
            deviceId: conflict.deviceId ?? undefined,
          },
          deps,
        );
        conflicts += 1;
      }
    },
  );

  return { applied, conflicts, skipped };
}

export interface PullSummary {
  applied: number;
  conflicts: number;
  skipped: number;
  cursor: string | null;
  serverTime: number;
}

export type PullTransport = (
  cursor: string | null,
  deviceId: string,
) => Promise<Result<PullResponse>>;

const defaultTransport: PullTransport = (cursor, deviceId) => pullChanges(cursor, deviceId);

/** 拉取并应用一页；成功后才推进游标，失败保留原游标。 */
export async function pullOnce(
  principalId: string,
  transport: PullTransport = defaultTransport,
): Promise<Result<PullSummary>> {
  if (principalId.length === 0) {
    return fail('validation.invalid_input', { field: 'principalId' });
  }
  const deviceId = getDeviceId();
  const cursor = readPullCursor(principalId);

  const response = await transport(cursor, deviceId);
  if (!response.ok) return response;

  const summary = await applyPullChanges(response.value.changes, deviceId);
  writePullCursor(principalId, response.value.cursor);
  const serverTime = response.value.serverTime || systemClock.now();
  await markDeviceSynced(principalId, serverTime);

  return ok({
    ...summary,
    cursor: response.value.cursor ?? cursor,
    serverTime,
  });
}

/**
 * 外壳挂载一次：默认 3 秒轮询；页面不可见暂停、恢复立即补一次；
 * 断网保留游标并按退避拉长间隔，网络恢复立即续传。
 */
export function startSyncPull(principalId: string): () => void {
  if (principalId.length === 0) return () => {};

  const loop = createPullLoop({
    run: () => pullOnce(principalId),
    isHidden: () => typeof document !== 'undefined' && document.visibilityState === 'hidden',
    isOnline: () => typeof navigator === 'undefined' || navigator.onLine !== false,
  });

  const onVisibility = (): void => {
    if (document.visibilityState === 'visible') loop.poke();
  };
  const onOnline = (): void => loop.poke();

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('online', onOnline);
  loop.start();

  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('online', onOnline);
    loop.stop();
  };
}
