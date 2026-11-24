import { fail, ok, type Result } from '@/core/errors';
import { isBackupRestorable } from '@/core/rules/backup-manifest';
import { selectExpiredBackupIds } from '@/core/rules/backup-retention';
import { validateImportFile } from '@/core/rules/import-validate';
import { backupRowFromSnapshot, buildBackupSnapshot } from './backup-snapshot';
import { db, LOCAL_OWNER_ID } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { writeEvent } from './events';
import { backupRepository } from './repositories';
import { replaceBusinessTables } from './restore-tables';

export interface RestoreSnapshotInput {
  backupId: string;
}

export interface RestoreSnapshotResult {
  backupId: string;
  restoredAt: number;
  counts: Record<'branches' | 'tasks' | 'commits' | 'milestones' | 'badges', number>;
}

type RestoreStep = 'pre-restore' | 'replace';

class RestoreStepError extends Error {
  readonly step: RestoreStep;
  readonly cause: unknown;

  constructor(step: RestoreStep, cause: unknown) {
    super(`restore-step:${step}`);
    this.name = 'RestoreStepError';
    this.step = step;
    this.cause = cause;
  }
}

/**
 * 从快照整体恢复（PRD V1-06 OP-04 / OP-05）。
 *
 * 版本与正文结构先做纯函数校验，避免为不可恢复的快照写恢复前副本。
 * 校验通过后单事务执行「写 pre-restore → 整体替换七张表 → 重算四计数 → 标记 restoredAt」；
 * 任一步抛错整体回滚，`field` 标明失败步骤（`pre-restore` / `replace`）。
 * 已撤销提交保留 `voidedAt`，徽章只按快照行恢复，不重新判定或发放。
 */
export async function restoreSnapshot(
  input: RestoreSnapshotInput,
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<RestoreSnapshotResult>> {
  const target = await backupRepository.getById(input.backupId);
  if (!target) return fail('domain.not_found');
  if (target.kind === 'remote') return fail('validation.invalid_input', { field: 'kind' });
  if (!isBackupRestorable(target.schemaVersion)) {
    return fail('backup.version_unsupported', { field: 'schemaVersion' });
  }

  const parsed = validateImportFile(target.payload);
  if (!parsed.ok) return parsed;

  const { tables, summary } = parsed.value;

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
        db.yearReviews,
        db.backups,
        db.outbox,
      ],
      async (tx) => {
        const now = deps.clock.now();
        const tzOffset = deps.tzOffset(now);

        try {
          const snapshot = await buildBackupSnapshot(now, tzOffset);
          const preRestoreId = deps.ids.ulid(now);
          const preRestore = backupRowFromSnapshot(preRestoreId, 'pre-restore', now, snapshot);
          await backupRepository.create(preRestore);
        } catch (cause) {
          throw new RestoreStepError('pre-restore', cause);
        }

        try {
          await replaceBusinessTables(tables);
          // 恢复后旧队列指向的版本已不存在，留着会在下次同步里把旧行推回云端。
          await db.outbox.clear();
          await backupRepository.update(target.id, { restoredAt: now });
          await writeEvent(
            tx,
            'backup.restore',
            target.id,
            { backupId: target.id, schemaVersion: summary.schemaVersion },
            deps,
          );

          const rows = await backupRepository.listByOwner(LOCAL_OWNER_ID);
          const expired = selectExpiredBackupIds(rows);
          if (expired.length > 0) await backupRepository.remove(expired);
        } catch (cause) {
          throw new RestoreStepError('replace', cause);
        }

        return ok({
          backupId: target.id,
          restoredAt: now,
          counts: {
            branches: summary.counts.branches,
            tasks: summary.counts.tasks,
            commits: summary.counts.commits,
            milestones: summary.counts.milestones,
            badges: summary.counts.badges,
          },
        });
      },
    );
  } catch (cause) {
    if (cause instanceof RestoreStepError) {
      return fail('storage.write_failed', {
        retriable: true,
        field: cause.step,
        cause: cause.cause,
      });
    }
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
