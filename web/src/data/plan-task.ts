import { isDateString } from '@/core/clock';
import { fail, ok, type Result } from '@/core/errors';
import { isBranchAccepting } from '@/core/rules/branch-state';
import { db } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { writeEvent } from './events';
import { branchRepository, taskRepository } from './repositories';
import type { Task } from './types';

export interface PlanTaskInput {
  taskId: string;
  /** 安排到某天传日期；移出今天传 null。 */
  plannedDate: string | null;
}

/**
 * 安排到今天 / 移出今天（PRD M03 OP-04）。
 *
 * 只改 `plannedDate`，不改 `dueDate`；今天组与逾期组的互斥由 R8 分组函数保证。
 * 跨自然日后按原截止日期重新分组。
 */
export async function planTask(
  input: PlanTaskInput,
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<Task>> {
  const plannedDate = input.plannedDate?.trim() || null;
  if (plannedDate && !isDateString(plannedDate)) {
    return fail('validation.invalid_input', { field: 'plannedDate' });
  }

  try {
    return await db.transaction('rw', [db.branches, db.tasks, db.events, db.outbox], async (tx) => {
      const task = await taskRepository.getById(input.taskId);
      if (!task || task.deletedAt !== null) {
        return fail('domain.not_found', { field: 'taskId' });
      }
      if (task.status !== 'open') {
        return fail('validation.invalid_input', { field: 'status' });
      }

      const branch = await branchRepository.getById(task.branchId);
      if (!branch || !isBranchAccepting(branch)) {
        return fail('domain.readonly_branch', { field: 'branchId' });
      }

      if (task.plannedDate === plannedDate) {
        return ok(task);
      }

      const at = deps.clock.now();
      const nextTask: Task = {
        ...task,
        plannedDate,
        updatedAt: at,
        rev: task.rev + 1,
      };
      await taskRepository.update(task.id, { plannedDate, updatedAt: at }, task.rev);
      await writeEvent(
        tx,
        'task.plan',
        task.id,
        { taskId: task.id, from: task.plannedDate, to: plannedDate },
        deps,
      );

      return ok(nextTask);
    });
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
