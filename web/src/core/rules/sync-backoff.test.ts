import { describe, expect, it } from 'vitest';
import {
  BACKOFF_CAP_MS,
  SYNC_FAILURE_THRESHOLD,
  backoffDelay,
  isSyncFailed,
  resolveSyncStatus,
} from './sync-backoff';

describe('同步重试退避（V2-02 §8.2）', () => {
  it('未失败时不等待，负数与非法输入按 0 处理', () => {
    expect(backoffDelay(0)).toBe(0);
    expect(backoffDelay(-3)).toBe(0);
    expect(backoffDelay(Number.NaN)).toBe(0);
  });

  it('等待时间随失败次数指数增长', () => {
    expect(backoffDelay(1)).toBe(1_000);
    expect(backoffDelay(2)).toBe(2_000);
    expect(backoffDelay(3)).toBe(4_000);
    expect(backoffDelay(4)).toBe(8_000);
  });

  it('增长到上限后封顶且不溢出', () => {
    expect(backoffDelay(7)).toBe(BACKOFF_CAP_MS);
    expect(backoffDelay(999)).toBe(BACKOFF_CAP_MS);
    expect(Number.isFinite(backoffDelay(Number.MAX_SAFE_INTEGER))).toBe(true);
  });

  it('达到阈值才算同步失败', () => {
    expect(isSyncFailed(SYNC_FAILURE_THRESHOLD - 1)).toBe(false);
    expect(isSyncFailed(SYNC_FAILURE_THRESHOLD)).toBe(true);
    expect(isSyncFailed(SYNC_FAILURE_THRESHOLD + 1)).toBe(true);
  });

  it('状态优先级为同步中 > 离线 > 失败 > 已同步', () => {
    expect(resolveSyncStatus({ online: true, syncing: true, pending: 2, attempts: 9 })).toBe(
      'syncing',
    );
    expect(resolveSyncStatus({ online: false, syncing: false, pending: 2, attempts: 9 })).toBe(
      'offline',
    );
    expect(resolveSyncStatus({ online: true, syncing: false, pending: 2, attempts: 5 })).toBe(
      'failed',
    );
    expect(resolveSyncStatus({ online: true, syncing: false, pending: 0, attempts: 0 })).toBe(
      'synced',
    );
  });
});
