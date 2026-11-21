import { describe, expect, it } from 'vitest';
import { EXPORT_SCHEMA_VERSION } from './export-file';
import {
  BACKUP_STALE_MS,
  backupFreshness,
  isBackupRestorable,
  readBackupManifest,
} from './backup-manifest';

/**
 * 快照元数据与版本校验（PRD V1-06 §8.2）。
 *
 * 计数只来自快照正文；元数据里保存的旧数字不参与。版本缺失或不一致一律
 * 判定不可恢复，不做迁移、不猜字段。
 */

const NOW = Date.UTC(2026, 11, 1, 9, 0);

function payload(over: Record<string, unknown> = {}): string {
  return JSON.stringify({
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: '2026-11-21T09:00:00.000Z',
    appVersion: '0.1.0',
    branches: [],
    tasks: [],
    commits: [],
    milestones: [],
    badges: [],
    settings: [],
    events: [],
    ...over,
  });
}

describe('readBackupManifest（快照正文计数）', () => {
  it('计数只来自正文数组，不读取元数据里的旧数字', () => {
    const manifest = readBackupManifest(
      payload({
        branches: [{ id: 'b1' }, { id: 'b2' }],
        tasks: [{ id: 't1' }],
        commits: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }],
        milestones: [{ id: 'm1' }],
        badges: [],
        branchCount: 99,
        taskCount: 99,
        commitCount: 99,
      }),
    );

    expect(manifest?.counts).toEqual({
      branches: 2,
      tasks: 1,
      commits: 3,
      milestones: 1,
      badges: 0,
    });
  });

  it('空数据快照的计数全为 0', () => {
    expect(readBackupManifest(payload())?.counts).toEqual({
      branches: 0,
      tasks: 0,
      commits: 0,
      milestones: 0,
      badges: 0,
    });
  });

  it('正文混入示例树时不计入', () => {
    const manifest = readBackupManifest(
      payload({
        branches: [
          { id: 'example:root', ownerId: 'local' },
          { id: 'real-1', ownerId: 'local' },
          { id: 'real-2', ownerId: 'example' },
        ],
      }),
    );

    expect(manifest?.counts.branches).toBe(1);
  });

  it('缺 schemaVersion 时判为不可恢复', () => {
    const manifest = readBackupManifest(payload({ schemaVersion: undefined }));

    expect(manifest?.schemaVersion).toBeNull();
    expect(isBackupRestorable(manifest?.schemaVersion)).toBe(false);
  });

  it('版本不一致或缺失时判为不可恢复，当前版本可恢复', () => {
    expect(isBackupRestorable(EXPORT_SCHEMA_VERSION + 1)).toBe(false);
    expect(isBackupRestorable(null)).toBe(false);
    expect(isBackupRestorable(undefined)).toBe(false);
    expect(isBackupRestorable(EXPORT_SCHEMA_VERSION)).toBe(true);
  });

  it('正文不是 JSON 对象时返回 null', () => {
    expect(readBackupManifest('not-json')).toBeNull();
    expect(readBackupManifest('[]')).toBeNull();
    expect(readBackupManifest('')).toBeNull();
  });
});

describe('backupFreshness（新鲜度提示）', () => {
  it('恰好 7 天仍算新鲜，7 天多 1 分钟给出提示', () => {
    expect(backupFreshness(NOW - BACKUP_STALE_MS, NOW).stale).toBe(false);
    expect(backupFreshness(NOW - BACKUP_STALE_MS - 60_000, NOW).stale).toBe(true);
  });

  it('没有任何备份时不提示，天数按整天向下取整', () => {
    expect(backupFreshness(null, NOW)).toEqual({ stale: false, days: 0 });
    const eightDays = backupFreshness(NOW - 8 * 24 * 60 * 60 * 1000, NOW);
    expect(eightDays.stale).toBe(true);
    expect(eightDays.days).toBe(8);
  });
});
