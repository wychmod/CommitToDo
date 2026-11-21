import { toIsoString, toLocalDate } from '@/core/clock';
import { fail, ok, type Result } from '@/core/errors';
import {
  buildExportFile,
  exportByteLength,
  type ExportCounts,
  type ExportRecord,
} from '@/core/rules/export-file';
import { db, LOCAL_OWNER_ID } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import {
  badgeRepository,
  branchRepository,
  commitRepository,
  eventRepository,
  milestoneRepository,
  settingsRepository,
  taskRepository,
} from './repositories';
import type { Backup, BackupKind } from './types';

export interface BackupSnapshot {
  /** 与导出文件同结构的明文 JSON。 */
  text: string;
  bytes: number;
  schemaVersion: number;
  counts: ExportCounts;
  branchCount: number;
  taskCount: number;
  commitCount: number;
}

/**
 * 在调用方的事务内组装快照正文。
 *
 * 只读七张业务表；示例命名空间的行由 `buildExportFile` 剔除。
 * 自动、手动、恢复前与异地备份共用同一结构，下载后可直接走 M10 的从文件恢复。
 */
export async function buildBackupSnapshot(
  now: number,
  tzOffsetMinutes: number,
): Promise<BackupSnapshot> {
  const [branches, tasks, commits, milestones, badges, settings, events] = await Promise.all([
    branchRepository.listByOwner(LOCAL_OWNER_ID),
    taskRepository.listByOwner(LOCAL_OWNER_ID),
    commitRepository.listByOwner(LOCAL_OWNER_ID),
    milestoneRepository.listByOwner(LOCAL_OWNER_ID),
    badgeRepository.listByOwner(LOCAL_OWNER_ID),
    settingsRepository.listByOwner(LOCAL_OWNER_ID),
    eventRepository.listRecent(LOCAL_OWNER_ID, Number.MAX_SAFE_INTEGER),
  ]);

  const file = buildExportFile<ExportRecord>({
    exportedAt: toIsoString(now),
    localDate: toLocalDate(now, tzOffsetMinutes),
    branches,
    tasks,
    commits,
    milestones,
    badges,
    settings,
    events,
  });

  return {
    text: JSON.stringify(file.payload, null, 2),
    bytes: exportByteLength(file.payload),
    schemaVersion: file.payload.schemaVersion,
    counts: file.counts,
    branchCount: file.counts.branches,
    taskCount: file.counts.tasks,
    commitCount: file.counts.commits,
  };
}

/** 只读快照，供「立即备份」预览与异地上传使用；失败不产生半份记录。 */
export async function readBackupSnapshot(
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<BackupSnapshot>> {
  try {
    return await db.transaction(
      'r',
      [db.branches, db.tasks, db.commits, db.milestones, db.badges, db.settings, db.events],
      async () => {
        const now = deps.clock.now();
        return ok(await buildBackupSnapshot(now, deps.tzOffset(now)));
      },
    );
  } catch (cause) {
    return fail('storage.read_failed', { cause });
  }
}

/** 由快照组装落库行；`payload` 为正文，异地行的正文由远端保存。 */
export function backupRowFromSnapshot(
  id: string,
  kind: BackupKind,
  now: number,
  snapshot: BackupSnapshot,
  payload = snapshot.text,
  remoteKey: string | null = null,
): Backup {
  return {
    id,
    ownerId: LOCAL_OWNER_ID,
    kind,
    createdAt: now,
    branchCount: snapshot.branchCount,
    taskCount: snapshot.taskCount,
    commitCount: snapshot.commitCount,
    schemaVersion: snapshot.schemaVersion,
    bytes: snapshot.bytes,
    restoredAt: null,
    remoteKey,
    payload,
  };
}
