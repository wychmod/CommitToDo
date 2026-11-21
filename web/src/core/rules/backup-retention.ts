/**
 * 备份保留策略（PRD V1-06 R17 / OP-03）。
 *
 * 四类快照各自保留上限：auto 7、manual 7、pre-restore 1、remote 1，
 * 合计最多 16 条。淘汰只发生在同一类内部——自动快照超限时绝不淘汰
 * 手动、恢复前或异地记录，否则用户唯一的「回去的点」会悄悄消失。
 */

export type BackupRetentionKind = 'auto' | 'manual' | 'pre-restore' | 'remote';

export const BACKUP_RETENTION_LIMIT: Readonly<Record<BackupRetentionKind, number>> = {
  auto: 7,
  manual: 7,
  'pre-restore': 1,
  remote: 1,
};

export const BACKUP_TOTAL_LIMIT = 16;

export interface BackupRetentionRow {
  id: string;
  kind: string;
  createdAt: number;
}

const KINDS = Object.keys(BACKUP_RETENTION_LIMIT) as BackupRetentionKind[];

function isRetentionKind(kind: string): kind is BackupRetentionKind {
  return (KINDS as readonly string[]).includes(kind);
}

/** 备份列表统一按 `createdAt` 倒序；同毫秒时 id 大者视为更新（ULID 字典序即时间序）。 */
export function sortBackupsNewestFirst<T extends { createdAt: number; id: string }>(
  rows: readonly T[],
): T[] {
  return rows
    .slice()
    .sort((left, right) => right.createdAt - left.createdAt || right.id.localeCompare(left.id));
}

/**
 * 返回应淘汰的备份 id；调用方在同一事务里删除。
 *
 * 只处理四类已知 `kind`；未知类型保持在库中不动，交给后续版本决定。
 */
export function selectExpiredBackupIds(rows: readonly BackupRetentionRow[]): string[] {
  const expired: string[] = [];

  for (const kind of KINDS) {
    const group = sortBackupsNewestFirst(rows.filter((row) => row.kind === kind));
    const limit = BACKUP_RETENTION_LIMIT[kind];
    for (const row of group.slice(limit)) expired.push(row.id);
  }

  return expired;
}

/** 校验类目是否属于保留策略；仅测试与调用方断言使用。 */
export function isBackupRetentionKind(kind: string): kind is BackupRetentionKind {
  return isRetentionKind(kind);
}
