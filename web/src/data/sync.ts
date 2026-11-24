import type { Table } from 'dexie';
import { systemClock } from '@/core/clock';
import { fail, ok, type Result } from '@/core/errors';
import { buildConflict } from '@/core/rules/sync-conflict';
import { pushOutbox, fetchDevices } from './cloud/sync';
import { db } from './db';
import { defaultWriteDeps } from './deps';
import {
  ensureCurrentDevice,
  getDeviceId,
  markDeviceSynced,
  replaceRemoteDevices,
} from './devices';
import { writeEvent } from './events';
import { trackOpsEvent } from './ops-events';
import type { SyncRunSummary } from './sync-types';
import type { OutboxOp, SyncConflict } from './types';

/**
 * outbox 补推（PRD V2-02 OP-02/OP-03）。
 *
 * 按 `createdAt` 顺序推送；成功后删除队列行，被服务端拒绝时采用服务端版本、
 * 写 `conflicts` 并在分支留一条 `sync.conflict`。失败只累加 `attempts`，
 * 不丢弃队列，也不影响本机编辑。
 */

const TABLE_OF_ENTITY: Record<string, string> = {
  branch: 'branches',
  task: 'tasks',
  commit: 'commits',
  milestone: 'milestones',
  badge: 'badges',
};

export function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

async function recordConflict(
  op: OutboxOp,
  serverRev: number | null,
  server: Record<string, unknown> | null,
): Promise<void> {
  const deps = defaultWriteDeps;
  const at = deps.clock.now();
  const branchId =
    typeof op.payload.branchId === 'string'
      ? op.payload.branchId
      : typeof server?.branchId === 'string'
        ? server.branchId
        : op.entity === 'branch'
          ? op.entityId
          : null;
  const tableName = TABLE_OF_ENTITY[op.entity];
  const tables: Table[] = [db.conflicts, db.events, db.outbox];
  if (tableName) tables.push(db.table(tableName));

  await db.transaction('rw', tables, async (tx) => {
    const localRev = typeof op.payload.rev === 'number' ? op.payload.rev : null;
    const conflict: SyncConflict = {
      id: deps.ids.ulid(at),
      ownerId: typeof op.payload.ownerId === 'string' ? op.payload.ownerId : '',
      ...buildConflict({
        entity: op.entity,
        entityId: op.entityId,
        branchId,
        field: null,
        localPayload: op.payload,
        serverPayload: server,
        deviceId: getDeviceId(),
        localRev,
        serverRev,
        at,
      }),
    };
    await tx.table<SyncConflict, string>('conflicts').add(conflict);

    // 采用服务端当前版本，不自动用本地版本覆盖。
    if (tableName && server && typeof server.id === 'string') {
      await tx.table<Record<string, unknown>, string>(tableName).put(server);
    }

    await writeEvent(
      tx,
      'sync.conflict',
      op.entityId,
      {
        branchId,
        entityId: op.entityId,
        field: '',
        entity: op.entity,
        deviceId: conflict.deviceId ?? undefined,
      },
      deps,
    );
  });
}

/**
 * 同步进行中的订阅（PRD V2-02 OP-07）。
 *
 * `runSync` 内部有 `inFlight` 去重，但界面过去只在自己点「立即同步」时置状态，
 * 自动补推与拉取轮询期间一直显示「已同步」。这里把真实执行状态广播出去，
 * 让设置页的同步徽标与真实行为一致。
 */
type SyncListener = (syncing: boolean) => void;

const syncListeners = new Set<SyncListener>();
let syncingCount = 0;

export function isSyncing(): boolean {
  return syncingCount > 0;
}

/** 订阅执行状态；返回取消订阅函数。 */
export function subscribeSyncState(listener: SyncListener): () => void {
  syncListeners.add(listener);
  listener(isSyncing());
  return () => {
    syncListeners.delete(listener);
  };
}

function setSyncing(delta: number): void {
  syncingCount = Math.max(0, syncingCount + delta);
  for (const listener of syncListeners) listener(isSyncing());
}

export async function runSync(
  principalId: string,
  options: { force?: boolean } = {},
): Promise<Result<SyncRunSummary>> {
  if (inFlight) return inFlight;
  setSyncing(1);
  inFlight = executeSync(principalId, options).finally(() => {
    inFlight = null;
    setSyncing(-1);
  });
  return inFlight;
}

let inFlight: Promise<Result<SyncRunSummary>> | null = null;

async function executeSync(
  principalId: string,
  options: { force?: boolean } = {},
): Promise<Result<SyncRunSummary>> {
  if (principalId.length === 0) {
    return fail('validation.invalid_input', { field: 'principalId' });
  }

  const device = await ensureCurrentDevice(principalId);
  const ops = await db.outbox.orderBy('createdAt').toArray();

  if (!isOnline() && !options.force) {
    return ok({
      pushed: 0,
      conflicts: 0,
      pending: ops.length,
      lastSyncAt: device.lastSyncAt,
      offline: true,
    });
  }

  if (ops.length === 0) {
    const devices = await fetchDevices();
    if (devices.ok) await replaceRemoteDevices(principalId, devices.value);
    const at = systemClock.now();
    await markDeviceSynced(principalId, at);
    return ok({ pushed: 0, conflicts: 0, pending: 0, lastSyncAt: at, offline: false });
  }

  let response;
  try {
    response = await pushOutbox(ops, {
      id: device.id,
      label: device.label,
      platform: device.platform,
    });
  } catch (cause) {
    return fail('sync.failed', { retriable: true, cause });
  }

  if (!response.ok) {
    const code = response.error.code;
    await db.outbox.toCollection().modify((row) => {
      row.attempts += 1;
      row.lastError = code;
    });
    trackOpsEvent('sync.push', { ops: ops.length, result: 'failed', errorCode: code });
    return fail(code, { retriable: true, cause: response.error.cause });
  }

  const byOp = new Map(response.value.results.map((row) => [row.opId, row]));
  let pushed = 0;
  let conflicts = 0;

  for (const op of ops) {
    const result = byOp.get(op.opId);
    if (!result) continue;
    if (result.accepted) {
      await db.outbox.delete(op.opId);
      pushed += 1;
      // 服务端每次写入递增 rev；本机同步跟进，下一次补推才不会把自己判成过期写入。
      const tableName = TABLE_OF_ENTITY[op.entity];
      if (tableName && typeof result.serverRev === 'number') {
        await db.table(tableName).update(op.entityId, { rev: result.serverRev });
      }
      continue;
    }
    await recordConflict(op, result.serverRev ?? null, result.server ?? null);
    await db.outbox.delete(op.opId);
    conflicts += 1;
  }

  const lastSyncAt = response.value.serverTime || systemClock.now();
  await markDeviceSynced(principalId, lastSyncAt);
  if (response.value.devices.length > 0) {
    await replaceRemoteDevices(principalId, response.value.devices);
  }

  trackOpsEvent('sync.push', {
    ops: ops.length,
    result: conflicts > 0 ? 'conflict' : 'success',
  });

  return ok({
    pushed,
    conflicts,
    pending: await db.outbox.count(),
    lastSyncAt,
    offline: false,
  });
}

/** 连续失败次数取队列里最差的一条，供退避与「同步失败」判定。 */
export async function maxAttempts(): Promise<number> {
  const rows = await db.outbox.toArray();
  return rows.reduce((max, row) => Math.max(max, row.attempts), 0);
}
