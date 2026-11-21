import { fail, ok, type Result } from '@/core/errors';
import { collectSubtree } from '@/core/rules/branch-path';
import { assessFinish, type FinishBlockReason } from '@/core/rules/finish-precheck';
import { planFinishMigration } from '@/core/rules/finish-plan';
import { syncBranchCounts } from './branch-counts';
import { db, LOCAL_OWNER_ID } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { writeEvent } from './events';
import { branchRepository, commitRepository, taskRepository } from './repositories';
import type { Branch } from './types';

export interface FinishBranchInput {
  branchId: string;
  /** `true` 收尾后归档；`false` 留在默认树（只读、仍计活跃额度）。 */
  archived: boolean;
}

function finishFailure(reason: FinishBlockReason): Result<never> {
  switch (reason) {
    case 'parent-missing':
      return fail('domain.not_found', { field: 'parentId' });
    case 'parent-readonly':
      return fail('domain.readonly_branch', { field: 'parentId' });
    case 'unfinished-descendant':
      return fail('domain.conflict', { field: 'branchId' });
    default:
      return fail('domain.readonly_branch', { field: 'branchId' });
  }
}

/**
 * 收尾分支（PRD M08 OP-04 / OP-05，R12）。
 *
 * 只能合并到直接父分支；单事务内把未完成待办与全部未删除提交（含已撤销）改属父分支，
 * 子分支标记为已合并并写 `finishedAt` / `finishedIntoId`，选归档时同事务写 `archivedAt`；
 * 父分支四计数按 R7 重算。任一步失败整体回滚，不出现「待办已移走、分支仍进行中」。
 */
export async function finishBranch(
  input: FinishBranchInput,
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<Branch>> {
  try {
    return await db.transaction(
      'rw',
      [db.branches, db.tasks, db.commits, db.events],
      async (tx) => {
        const all = await branchRepository.listByOwner(LOCAL_OWNER_ID);
        const live = all.filter((branch) => branch.deletedAt === null);
        const subject = live.find((branch) => branch.id === input.branchId);
        if (!subject) return fail('domain.not_found', { field: 'branchId' });

        const parent = subject.parentId
          ? live.find((branch) => branch.id === subject.parentId)
          : undefined;
        const descendants = collectSubtree(live, subject.path).filter(
          (branch) => branch.id !== subject.id,
        );

        const [tasks, commits] = await Promise.all([
          taskRepository.listByOwner(LOCAL_OWNER_ID),
          commitRepository.listByOwner(LOCAL_OWNER_ID),
        ]);
        const plan = planFinishMigration(subject.id, tasks, commits, []);
        const precheck = assessFinish({
          subject,
          parent,
          descendants,
          commitCount: plan.movedCommits.length,
          openTaskCount: plan.movedTasks.length,
        });
        if (!precheck.allowed || !parent) {
          return finishFailure(precheck.reason ?? 'readonly');
        }

        const at = deps.clock.now();
        for (const moved of plan.movedTasks) {
          const row = tasks.find((task) => task.id === moved.id);
          if (!row) continue;
          await taskRepository.update(row.id, { branchId: parent.id }, row.rev);
        }
        for (const moved of plan.movedCommits) {
          const row = commits.find((commit) => commit.id === moved.id);
          if (!row) continue;
          // sourceBranchId 保留原分支，父分支提交流据此标注「来自 X」。
          await commitRepository.update(row.id, { branchId: parent.id }, row.rev);
        }

        const next: Branch = {
          ...subject,
          status: 'merged',
          finishedAt: at,
          finishedIntoId: parent.id,
          archivedAt: input.archived ? at : null,
          rev: subject.rev + 1,
          updatedAt: at,
        };
        await branchRepository.put(next);
        await syncBranchCounts(parent.id, deps);

        await writeEvent(
          tx,
          'branch.finish',
          subject.id,
          {
            branchId: subject.id,
            finishedIntoId: parent.id,
            archived: input.archived,
            movedTaskCount: plan.movedTasks.length,
          },
          deps,
        );

        return ok(next);
      },
    );
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
