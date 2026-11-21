import { fail, ok, type Result } from '@/core/errors';
import { commitVoidPatch, taskUndoPatch, undoDecision } from '@/core/rules/commit-undo';
import { isCommitLocked } from '@/core/rules/commit-lock';
import { resolveUndoBranchId } from '@/core/rules/undo-target';
import { syncBranchCounts } from './branch-counts';
import { db } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { writeEvent } from './events';
import { branchRepository, commitRepository, taskRepository } from './repositories';
import type { Commit, Task } from './types';

export interface UndoCommitInput {
  commitId: string;
}

export interface UndoCommitValue {
  commit: Commit;
  task: Task | null;
  targetBranchId: string | null;
  /** 重复撤销时为 true：没有第二次写入，也没有新事件。 */
  noop: boolean;
}

/**
 * 撤销完成（PRD M05 OP-06 / R2）。
 *
 * 提交写 `voidedAt` 而不删；关联待办回到未完成并清空完成字段。
 * 原分支已合并、已放下或已归档时，待办恢复到最近可接收的祖先分支；
 * 待办与提交、四计数、事件在同一事务内完成，任一失败全部回滚。
 */
export async function undoCommit(
  input: UndoCommitInput,
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<UndoCommitValue>> {
  try {
    return await db.transaction(
      'rw',
      [db.commits, db.tasks, db.branches, db.events],
      async (tx) => {
        const commit = await commitRepository.getById(input.commitId);
        if (!commit || commit.deletedAt !== null) {
          return fail('domain.not_found', { field: 'commitId' });
        }
        if (undoDecision(commit) === 'noop') {
          return ok({ commit, task: null, targetBranchId: null, noop: true });
        }

        const now = deps.clock.now();
        if (isCommitLocked(commit.date, deps.tzOffset(now), now)) {
          return fail('domain.conflict', { field: 'commitId' });
        }

        const task = commit.taskId ? await taskRepository.getById(commit.taskId) : undefined;
        if (!task || task.deletedAt !== null) {
          return fail('domain.not_found', { field: 'taskId' });
        }

        const branches = await branchRepository.listByOwner(task.ownerId);
        const byId = new Map(branches.map((branch) => [branch.id, branch]));
        const targetBranchId = resolveUndoBranchId(task.branchId, byId);
        const moved = targetBranchId !== task.branchId;

        const taskPatch = taskUndoPatch(now);
        const commitPatch = commitVoidPatch(now);
        const taskNext: Task = {
          ...task,
          ...taskPatch,
          branchId: targetBranchId,
          rev: task.rev + 1,
        };
        const commitNext: Commit = {
          ...commit,
          ...commitPatch,
          rev: commit.rev + 1,
        };

        await taskRepository.update(task.id, { ...taskPatch, branchId: targetBranchId }, task.rev);
        await commitRepository.update(commit.id, commitPatch, commit.rev);

        const affected = new Set<string>([commit.branchId, task.branchId, targetBranchId]);
        for (const branchId of affected) {
          await syncBranchCounts(branchId, deps);
        }

        await writeEvent(
          tx,
          'commit.void',
          commit.id,
          { commitId: commit.id, taskId: task.id },
          deps,
        );
        if (moved) {
          await writeEvent(
            tx,
            'task.update',
            task.id,
            {
              taskId: task.id,
              fields: ['branchId', 'status', 'completedAt', 'completedCommitId'],
              fromBranchId: task.branchId,
              toBranchId: targetBranchId,
            },
            deps,
          );
        }

        return ok({ commit: commitNext, task: taskNext, targetBranchId, noop: false });
      },
    );
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
