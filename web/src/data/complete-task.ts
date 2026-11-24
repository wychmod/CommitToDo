import { toLocalDate } from '@/core/clock';
import { fail, ok, type Result } from '@/core/errors';
import { syncBranchCounts } from './branch-counts';
import { db, LOCAL_OWNER_ID } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { writeEvent } from './events';
import { enqueueEntityWrite } from './outbox';
import { trackOpsEvent } from './ops-events';
import { grantBadge } from './grant-badge';
import { commitRepository, taskRepository } from './repositories';
import type { Commit, Task } from './types';
import { requireWritableBranch } from './write-guard';

export interface CompleteTaskValue {
  task: Task;
  commit: Commit;
}

/**
 * 完成待办并生成提交（PRD M03 OP-02 / R1 / E-01）。
 *
 * 同一事务写：`tasks.status/completedAt/completedCommitId`、新建 `commits`、
 * 重算 `branches` 四计数、记 `task.complete`。任一步失败全部回滚。
 * 已完成的待办再次调用直接返回既有提交，不产生第二条提交。
 */
export async function completeTask(
  input: { taskId: string },
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<CompleteTaskValue>> {
  try {
    let createdNow = false;
    const result = await db.transaction(
      'rw',
      [db.tasks, db.commits, db.branches, db.events, db.outbox],
      async (tx) => {
        const task = await taskRepository.getById(input.taskId);
        if (!task || task.deletedAt !== null) {
          return fail('domain.not_found', { field: 'taskId' });
        }

        if (task.status === 'done') {
          const existing = task.completedCommitId
            ? await commitRepository.getById(task.completedCommitId)
            : undefined;
          if (!existing) {
            return fail('domain.conflict', { field: 'status' });
          }
          return ok({ task, commit: existing });
        }
        if (task.status !== 'open') {
          return fail('validation.invalid_input', { field: 'status' });
        }

        // 祖先归档 / 合并 / 删除时整棵子树只读，统一走用例侧准入。
        const branch = await requireWritableBranch(task.branchId);
        if (!branch.ok) return fail(branch.error.code, { field: 'branchId' });

        const at = deps.clock.now();
        const updatedAt = at;
        const commit: Commit = {
          id: deps.ids.ulid(at),
          ownerId: LOCAL_OWNER_ID,
          branchId: task.branchId,
          sourceBranchId: task.branchId,
          taskId: task.id,
          date: toLocalDate(at, deps.tzOffset(at)),
          at,
          summary: task.title,
          voidedAt: null,
          rev: 1,
          createdAt: at,
          updatedAt,
          deletedAt: null,
        };
        const nextTask: Task = {
          ...task,
          status: 'done',
          completedAt: at,
          completedCommitId: commit.id,
          updatedAt,
          rev: task.rev + 1,
        };

        await taskRepository.update(
          task.id,
          {
            status: nextTask.status,
            completedAt: nextTask.completedAt,
            completedCommitId: nextTask.completedCommitId,
            updatedAt,
          },
          task.rev,
        );
        await commitRepository.create(commit);
        // 新提交本身也要入队：`task.complete` 的事件只覆盖待办行。
        await enqueueEntityWrite(
          tx,
          'commit',
          commit.id,
          'commit.create',
          { commitId: commit.id, taskId: task.id, branchId: task.branchId },
          deps,
        );
        await syncBranchCounts(tx, task.branchId, deps);
        await writeEvent(
          tx,
          'task.complete',
          task.id,
          { taskId: task.id, commitId: commit.id, branchId: task.branchId },
          deps,
        );

        createdNow = true;
        return ok({ task: nextTask, commit });
      },
    );
    // 徽章发放失败不回滚主操作；下次启动或进入「我的」时补查。
    if (result.ok) await grantBadge(deps);
    if (result.ok && createdNow) {
      trackOpsEvent('task.complete', { count: 1 });
      trackOpsEvent('commit.create', { count: 1 });
    }
    return result;
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
