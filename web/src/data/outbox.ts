import type { Transaction } from 'dexie';
import { systemIds } from '@/core/ids';
import { defaultWriteDeps, type WriteDeps } from './deps';
import type { OutboxOp } from './types';

/**
 * 本地先写并入队（PRD V2-02 OP-01）。
 *
 * 与业务写入同事务落 `outbox`，界面不等云端返回；任一步失败整体回滚。
 * payload 取动作完成后的实体快照；`baseRev` 必须是**这次写入之前**的 `rev`
 * （服务端据此判断本地是否基于最新版本），而快照是在写入之后读的，
 * 所以取 `rev - 1`。首次写入（`.create`）不带 `baseRev`。
 *
 * 不变量：每一行业务数据的 `rev` 每自增一次，就必须入队一条 outbox。
 * 否则本地 `rev` 会领先服务端多格，下一次推送的 `baseRev` 永远对不上，
 * 该行之后的本地改动会被服务端判成过期写入而回退成服务端旧版本。
 * 因此计数重算（`syncBranchCounts`）、排序、置顶、移动子树这类不写 `events`
 * 的写入，也要用 `enqueueEntityWrite()` 单独入队。
 */

/**
 * 参与补推的业务实体。`sync` 是冲突留痕的审计实体，只落本机 `events`：
 * 它由 `recordConflict` 在同一事务里写回，若再入队会在服务端拒绝时递归产生新冲突。
 */
export const SYNCED_ENTITIES = ['branch', 'task', 'commit', 'milestone', 'badge'] as const;

export type SyncedEntity = (typeof SYNCED_ENTITIES)[number];

const SNAPSHOT_TABLES: Partial<Record<SyncedEntity, string>> = {
  branch: 'branches',
  task: 'tasks',
  commit: 'commits',
  milestone: 'milestones',
  badge: 'badges',
};

export function isSyncedEntity(entity: string): entity is SyncedEntity {
  return (SYNCED_ENTITIES as readonly string[]).includes(entity);
}

/** `settings` / `data` / `backup` 不参与同步，直接返回 null，不写 outbox。 */
export async function enqueueWrite(
  tx: Transaction,
  action: string,
  entityId: string,
  payload: Record<string, unknown>,
  deps: WriteDeps = defaultWriteDeps,
): Promise<string | null> {
  const entity = entityOf(action);
  if (!entity) return null;
  return enqueueEntityWrite(tx, entity, entityId, action, payload, deps);
}

/**
 * 不写 `events` 的行级写入直接入队（计数重算、排序、置顶、移动子树等）。
 *
 * 与 `enqueueWrite` 的差别只有两点：调用方直接给实体名，不必编造一个 action 前缀；
 * 服务端只按快照落行，不看 action。其余（同事务、快照、`baseRev`）完全一致。
 */
export async function enqueueEntityWrite(
  tx: Transaction,
  entity: string,
  entityId: string,
  action: string,
  payload: Record<string, unknown>,
  deps: WriteDeps = defaultWriteDeps,
): Promise<string | null> {
  if (!isSyncedEntity(entity)) return null;

  const tableName = SNAPSHOT_TABLES[entity];
  let snapshot: Record<string, unknown> | null = null;
  let baseRev: number | null = null;
  if (tableName) {
    try {
      const row = await tx.table<Record<string, unknown>, string>(tableName).get(entityId);
      if (row) {
        snapshot = row;
        const rev = typeof row.rev === 'number' ? row.rev : null;
        // 快照是写入之后读的：这次写入之前的版本是 rev - 1。
        baseRev = action.endsWith('.create') || rev === null ? null : Math.max(0, rev - 1);
      }
    } catch {
      // 事务未包含该实体表（例如只测事件写入）时退回动作 payload。
      snapshot = null;
    }
  }

  const at = deps.clock.now();
  const op: OutboxOp = {
    // opId 不使用调用方的 ID 序列，避免占掉业务行与事件的顺序。
    opId: systemIds.ulid(at),
    entity: entity as SyncedEntity,
    entityId,
    action,
    payload: snapshot ?? payload,
    baseRev,
    attempts: 0,
    lastError: null,
    createdAt: at,
  };
  await tx.table<OutboxOp, string>('outbox').add(op);
  return op.opId;
}

function entityOf(action: string): SyncedEntity | null {
  const separator = action.indexOf('.');
  const entity = separator > 0 ? action.slice(0, separator) : '';
  return isSyncedEntity(entity) ? entity : null;
}
