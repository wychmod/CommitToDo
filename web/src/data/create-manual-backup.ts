import { fail, ok, type Result } from '@/core/errors';
import { selectExpiredBackupIds } from '@/core/rules/backup-retention';
import { backupRowFromSnapshot, buildBackupSnapshot } from './backup-snapshot';
import { db, LOCAL_OWNER_ID } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { writeEvent } from './events';
import { backupRepository } from './repositories';
import type { Backup } from './types';

/**
 * 立即备份（PRD V1-06 OP-02）。
 *
 * 手动快照不进每日判断，随时可写；与自动快照共用正文结构，
 * 保留策略只淘汰超过 7 条的最旧手动快照，不动其它三类。
 */
export async function createManualBackup(
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<Backup>> {
  try {
    return await db.transaction(
      'rw',
      [
        db.branches,
        db.tasks,
        db.commits,
        db.milestones,
        db.badges,
        db.settings,
        db.events,
        db.backups,
      ],
      async (tx) => {
        const now = deps.clock.now();
        const tzOffset = deps.tzOffset(now);
        const snapshot = await buildBackupSnapshot(now, tzOffset);
        const id = deps.ids.ulid(now);
        const row = backupRowFromSnapshot(id, 'manual', now, snapshot);

        await backupRepository.create(row);
        await writeEvent(tx, 'backup.create', id, { backupId: id, kind: 'manual' }, deps);

        const existing = await backupRepository.listByOwner(LOCAL_OWNER_ID);
        const expired = selectExpiredBackupIds(
          existing.filter((item) => item.id !== id).concat(row),
        );
        if (expired.length > 0) await backupRepository.remove(expired);

        return ok(row);
      },
    );
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
