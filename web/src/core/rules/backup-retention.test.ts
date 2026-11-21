import { describe, expect, it } from 'vitest';
import {
  BACKUP_RETENTION_LIMIT,
  BACKUP_TOTAL_LIMIT,
  selectExpiredBackupIds,
  sortBackupsNewestFirst,
  type BackupRetentionKind,
  type BackupRetentionRow,
} from './backup-retention';

/**
 * 备份保留策略（PRD V1-06 §8.2）。
 *
 * 最值钱的回归：自动快照超限时只淘汰最旧的自动快照。若按全局最旧记录淘汰，
 * 手动备份或唯一的恢复前副本会先被删掉——用户真正需要「回去」的点反而消失。
 */

const DAY = 24 * 60 * 60 * 1000;
const BASE = Date.UTC(2026, 10, 1, 9, 0);

function row(
  kind: BackupRetentionKind,
  index: number,
  over: Partial<BackupRetentionRow> = {},
): BackupRetentionRow {
  return {
    id: `${kind}-${String(index).padStart(2, '0')}`,
    kind,
    createdAt: BASE + index * DAY,
    ...over,
  };
}

function ids(rows: readonly BackupRetentionRow[]): string[] {
  return selectExpiredBackupIds(rows).sort();
}

describe('selectExpiredBackupIds（R17 保留策略）', () => {
  it('auto 恰好 7 条时再加 1 条，只淘汰最旧的一条 auto', () => {
    const rows = Array.from({ length: 8 }, (_, index) => row('auto', index));

    expect(ids(rows)).toEqual(['auto-00']);
  });

  it('auto 与 manual 同时超限时各淘汰各的，恢复前与异地记录不动', () => {
    const rows = [
      ...Array.from({ length: 8 }, (_, index) => row('auto', index)),
      ...Array.from({ length: 8 }, (_, index) => row('manual', index)),
      row('pre-restore', 0),
      row('remote', 0),
    ];

    const expired = ids(rows);

    expect(expired).toEqual(['auto-00', 'manual-00']);
    expect(expired).not.toContain('pre-restore-00');
    expect(expired).not.toContain('remote-00');
  });

  it('只有 pre-restore 时保留最近 1 条，淘汰更早的一条', () => {
    const rows = [row('pre-restore', 0), row('pre-restore', 1)];

    expect(ids(rows)).toEqual(['pre-restore-00']);
  });

  it('同毫秒 createdAt 时按 id 倒序稳定保留最新的一条', () => {
    const at = BASE;
    const rows: BackupRetentionRow[] = [
      { id: 'a', kind: 'remote', createdAt: at },
      { id: 'c', kind: 'remote', createdAt: at },
      { id: 'b', kind: 'remote', createdAt: at },
    ];

    expect(ids(rows)).toEqual(['a', 'b']);
  });

  it('四类都堆到上限后合计不超过 16 条', () => {
    const rows = [
      ...Array.from({ length: 9 }, (_, index) => row('auto', index)),
      ...Array.from({ length: 9 }, (_, index) => row('manual', index)),
      ...Array.from({ length: 2 }, (_, index) => row('pre-restore', index)),
      ...Array.from({ length: 2 }, (_, index) => row('remote', index)),
    ];

    const expired = selectExpiredBackupIds(rows);
    const remaining = rows.length - expired.length;

    expect(remaining).toBe(BACKUP_TOTAL_LIMIT);
    expect(BACKUP_RETENTION_LIMIT.auto + BACKUP_RETENTION_LIMIT.manual).toBe(14);
  });

  it('列表按 createdAt 倒序；同毫秒按 id 倒序', () => {
    const rows = [
      row('auto', 0),
      row('auto', 2),
      row('auto', 1),
      { id: 'z', kind: 'auto' as const, createdAt: BASE + 2 * DAY },
    ];

    expect(sortBackupsNewestFirst(rows).map((item) => item.id)).toEqual([
      'z',
      'auto-02',
      'auto-01',
      'auto-00',
    ]);
  });
});
