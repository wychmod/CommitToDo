import { fail, ok, type Result } from '@/core/errors';
import { recountBranch } from '@/core/rules/counters';
import { EXPORT_SCHEMA_VERSION } from '@/core/rules/export-file';
import { isBackupRestorable } from '@/core/rules/backup-manifest';
import { selectExpiredBackupIds } from '@/core/rules/backup-retention';
import { validateImportFile, type ImportTables } from '@/core/rules/import-validate';
import { backupRowFromSnapshot, buildBackupSnapshot } from './backup-snapshot';
import { db, LOCAL_OWNER_ID } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { writeEvent } from './events';
import { backupRepository } from './repositories';
import type { Badge, Branch, Commit, EventRecord, Milestone, Settings, Task } from './types';

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

async function replaceBusinessTables(tables: ImportTables): Promise<void> {
  const tasks = tables.tasks as unknown as Task[];
  const commits = tables.commits as unknown as Commit[];
  const branches = (tables.branches as unknown as Branch[]).map((branch) => ({
    ...branch,
    ...recountBranch(branch.id, tasks, commits),
  }));

  await Promise.all([
    db.branches.clear(),
    db.tasks.clear(),
    db.commits.clear(),
    db.milestones.clear(),
    db.badges.clear(),
    db.settings.clear(),
    db.events.clear(),
  ]);

  await db.branches.bulkPut(branches);
  await db.tasks.bulkPut(tasks);
  await db.commits.bulkPut(commits);
  await db.milestones.bulkPut(tables.milestones as unknown as Milestone[]);
  await db.badges.bulkPut(tables.badges as unknown as Badge[]);
  await db.settings.bulkPut(tables.settings as unknown as Settings[]);
  await db.events.bulkPut(tables.events as unknown as EventRecord[]);
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
  if (!isBackupRestorable(target.schemaVersion, EXPORT_SCHEMA_VERSION)) {
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
