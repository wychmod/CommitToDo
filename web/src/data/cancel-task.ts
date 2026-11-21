import { fail, ok, type Result } from '@/core/errors';
import { isBranchAccepting } from '@/core/rules/branch-state';
import { syncBranchCounts } from './branch-counts';
import { db } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { writeEvent } from './events';
import { branchRepository, taskRepository } from './repositories';
import type { Task } from './types';

/**
 * 取消待办（PRD M03 OP-06 / R7）。
 *
 * 只改状态与 `cancelledAt`，不物理删除；同事务重算 `taskTotal`，
 * 详情历史仍能读到 `task.cancel`。已完成待办不走这里。
 */
export async function cancelTask(
  input: { taskId: string },
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<Task>> {
  try {
    return await db.transaction(
      'rw',
      [db.branches, db.tasks, db.commits, db.events, db.outbox],
      async (tx) => {
        const task = await taskRepository.getById(input.taskId);
        if (!task || task.deletedAt !== null) {
          return fail('domain.not_found', { field: 'taskId' });
        }
        if (task.status === 'cancelled') {
          return ok(task);
        }
        if (task.status !== 'open') {
          return fail('domain.conflict', { field: 'status' });
        }

        const branch = await branchRepository.getById(task.branchId);
        if (!branch || !isBranchAccepting(branch)) {
          return fail('domain.readonly_branch', { field: 'branchId' });
        }

        const at = deps.clock.now();
        const nextTask: Task = {
          ...task,
          status: 'cancelled',
          cancelledAt: at,
          updatedAt: at,
          rev: task.rev + 1,
        };
        await taskRepository.update(
          task.id,
          { status: 'cancelled', cancelledAt: at, updatedAt: at },
          task.rev,
        );
        await syncBranchCounts(task.branchId, deps);
        await writeEvent(
          tx,
          'task.cancel',
          task.id,
          { taskId: task.id, branchId: task.branchId },
          deps,
        );

        return ok(nextTask);
      },
    );
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
