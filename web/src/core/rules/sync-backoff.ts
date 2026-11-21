/**
 * 同步重试退避与状态（PRD V2-02 OP-07 / §8.2）。
 *
 * 第 n 次失败后的等待时间按指数增长并封顶；达到阈值后界面转为「同步失败」，
 * 但不丢弃 outbox，手动重试仍从原队列继续。
 */

export const BACKOFF_BASE_MS = 1_000;
export const BACKOFF_CAP_MS = 60_000;
/** 连续失败达到该次数后显示「同步失败」。 */
export const SYNC_FAILURE_THRESHOLD = 5;

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'failed';

/** `attempts` 为已失败次数；0 表示尚未失败，不等待。 */
export function backoffDelay(attempts: number): number {
  if (!Number.isFinite(attempts) || attempts <= 0) return 0;
  // 上限保护：2^16 已远超封顶值，避免极大输入把指数撑爆。
  const step = Math.min(Math.floor(attempts), 16);
  return Math.min(BACKOFF_BASE_MS * 2 ** (step - 1), BACKOFF_CAP_MS);
}

export function isSyncFailed(attempts: number): boolean {
  return Number.isFinite(attempts) && attempts >= SYNC_FAILURE_THRESHOLD;
}

export interface SyncStatusInput {
  online: boolean;
  syncing: boolean;
  pending: number;
  attempts: number;
}

/**
 * 四态判定：同步中优先，其次离线，再按失败次数区分「同步失败」与「已同步」。
 * 待补传条数不改变状态本身，由界面与状态并排展示。
 */
export function resolveSyncStatus(input: SyncStatusInput): SyncStatus {
  if (input.syncing) return 'syncing';
  if (!input.online) return 'offline';
  if (isSyncFailed(input.attempts)) return 'failed';
  return 'synced';
}
