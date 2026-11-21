/**
 * 快照元数据与版本校验（PRD V1-06 OP-06 / §8.2）。
 *
 * 计数只读快照正文，不信任调用方或元数据里的旧数字；示例命名空间的行
 * 不计入。版本缺失或不等于当前导出格式时判定不可恢复，不做迁移。
 */

import { EXPORT_SCHEMA_VERSION, isExampleRecord, type ExportRecord } from './export-file';

export type BackupCountKey = 'branches' | 'tasks' | 'commits' | 'milestones' | 'badges';

export const BACKUP_COUNT_KEYS: readonly BackupCountKey[] = [
  'branches',
  'tasks',
  'commits',
  'milestones',
  'badges',
];

export type BackupCounts = Record<BackupCountKey, number>;

export interface BackupManifest {
  schemaVersion: number | null;
  counts: BackupCounts;
}

const EMPTY_COUNTS: BackupCounts = {
  branches: 0,
  tasks: 0,
  commits: 0,
  milestones: 0,
  badges: 0,
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** 解析快照正文；不是 JSON 对象时返回 null，由调用方按「无法恢复」处理。 */
export function readBackupManifest(payload: string | null | undefined): BackupManifest | null {
  if (typeof payload !== 'string' || payload.length === 0) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return null;
  }
  if (!isPlainObject(parsed)) return null;

  const counts: BackupCounts = { ...EMPTY_COUNTS };
  for (const key of BACKUP_COUNT_KEYS) {
    const rows = parsed[key];
    if (!Array.isArray(rows)) continue;
    counts[key] = rows.filter(
      (row) => !isPlainObject(row) || !isExampleRecord(row as unknown as ExportRecord),
    ).length;
  }

  const rawVersion = parsed.schemaVersion;
  const schemaVersion =
    typeof rawVersion === 'number' && Number.isInteger(rawVersion) && rawVersion > 0
      ? rawVersion
      : null;

  return { schemaVersion, counts };
}

/** 快照或异地备份能否被当前应用恢复。 */
export function isBackupRestorable(
  schemaVersion: number | null | undefined,
  current: number = EXPORT_SCHEMA_VERSION,
): boolean {
  return (
    typeof schemaVersion === 'number' &&
    Number.isInteger(schemaVersion) &&
    schemaVersion > 0 &&
    schemaVersion === current
  );
}

export const BACKUP_STALE_MS = 7 * 24 * 60 * 60 * 1000;

export interface BackupFreshness {
  /** 最近一次备份早于 7 天时为 true；恰好 7 天仍算新鲜。 */
  stale: boolean;
  days: number;
}

/** 备份新鲜度提示；没有任何备份时不提示（由空态承接）。 */
export function backupFreshness(lastBackupAt: number | null, now: number): BackupFreshness {
  if (lastBackupAt === null) return { stale: false, days: 0 };
  const elapsed = Math.max(0, now - lastBackupAt);
  return {
    stale: elapsed > BACKUP_STALE_MS,
    days: Math.floor(elapsed / (24 * 60 * 60 * 1000)),
  };
}
