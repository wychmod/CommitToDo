import { isDateString } from '@/core/clock';
import { fail, ok, type Result } from '@/core/errors';
import { syncBranchCounts } from './branch-counts';
import { db } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { writeEvent } from './events';
import { taskRepository } from './repositories';
import type { Task } from './types';
import { requireWritableBranch } from './write-guard';

export interface UpdateTaskInput {
  taskId: string;
  title: string;
  note: string | null;
  dueDate: string | null;
  plannedDate: string | null;
  branchId: string;
}

/**
 * 编辑待办（PRD M03 OP-05 / OP-07）。
 *
 * 标题、备注、截止日期、计划日期与所属分支一次保存；改归属时同事务
 * 重算原分支与新分支四计数，并在 `task.update` payload 里带前后 `branchId`。
 */
export async function updateTask(
  input: UpdateTaskInput,
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<Task>> {
  const title = input.title.trim();
  if (!title) {
    return fail('validation.title_empty', { field: 'title' });
  }
  const dueDate = input.dueDate?.trim() || null;
  const plannedDate = input.plannedDate?.trim() || null;
  if (dueDate && !isDateString(dueDate)) {
    return fail('validation.invalid_input', { field: 'dueDate' });
  }
  if (plannedDate && !isDateString(plannedDate)) {
    return fail('validation.invalid_input', { field: 'plannedDate' });
  }

  try {
    return await db.transaction(
      'rw',
      [db.branches, db.tasks, db.commits, db.events, db.outbox],
      async (tx) => {
        const task = await taskRepository.getById(input.taskId);
        if (!task || task.deletedAt !== null) {
          return fail('domain.not_found', { field: 'taskId' });
        }
        if (task.status !== 'open') {
          return fail('validation.invalid_input', { field: 'status' });
        }

        // 原分支与新分支都要过树级准入：任一侧被祖先归档都不可写。
        const currentBranch = await requireWritableBranch(task.branchId);
        if (!currentBranch.ok) return fail(currentBranch.error.code, { field: 'branchId' });

        const writableTarget = await requireWritableBranch(input.branchId);
        if (!writableTarget.ok) return fail(writableTarget.error.code, { field: 'branchId' });
        const targetBranch = writableTarget.value;

        const note = input.note?.trim() || null;
        const fields: string[] = [];
        if (task.title !== title) fields.push('title');
        if (task.note !== note) fields.push('note');
        if (task.dueDate !== dueDate) fields.push('dueDate');
        if (task.plannedDate !== plannedDate) fields.push('plannedDate');
        if (task.branchId !== targetBranch.id) fields.push('branchId');
        if (fields.length === 0) {
          return ok(task);
        }

        const at = deps.clock.now();
        const nextTask: Task = {
          ...task,
          title,
          note,
          dueDate,
          plannedDate,
          branchId: targetBranch.id,
          updatedAt: at,
          rev: task.rev + 1,
        };

        await taskRepository.update(
          task.id,
          {
            title,
            note,
            dueDate,
            plannedDate,
            branchId: targetBranch.id,
            updatedAt: at,
          },
          task.rev,
        );

        if (task.branchId !== targetBranch.id) {
          await syncBranchCounts(tx, task.branchId, deps);
          await syncBranchCounts(tx, targetBranch.id, deps);
        }

        await writeEvent(
          tx,
          'task.update',
          task.id,
          {
            taskId: task.id,
            fields,
            ...(task.branchId !== targetBranch.id
              ? { fromBranchId: task.branchId, toBranchId: targetBranch.id }
              : {}),
          },
          deps,
        );

        return ok(nextTask);
      },
    );
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
