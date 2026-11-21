import { isDateString } from '@/core/clock';
import { fail, ok, type Result } from '@/core/errors';
import { isBranchAccepting } from '@/core/rules/branch-state';
import { syncBranchCounts } from './branch-counts';
import { db, LOCAL_OWNER_ID } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { writeEvent } from './events';
import { branchRepository, taskRepository } from './repositories';
import type { Task } from './types';

export interface CreateTaskInput {
  title: string;
  /** 留空时落到根分支「我」。 */
  branchId?: string;
  dueDate?: string | null;
  plannedDate?: string | null;
  note?: string | null;
}

/**
 * 记一笔待办（PRD M03 OP-01 / B-01）。
 *
 * 标题是唯一必填项；日期为空表示没有截止。所属分支必须是进行中、
 * 未归档的默认树分支。写 `tasks` 与 `task.create` 在同一事务。
 */
export async function createTask(
  input: CreateTaskInput,
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
        const branches = await branchRepository.listByOwner(LOCAL_OWNER_ID);
        const live = branches.filter((branch) => branch.deletedAt === null);
        const root = live.find((branch) => branch.depth === 0);
        const target = input.branchId ? live.find((branch) => branch.id === input.branchId) : root;

        if (!target) {
          return fail('domain.not_found', { field: 'branchId' });
        }
        if (!isBranchAccepting(target)) {
          return fail('domain.readonly_branch', { field: 'branchId' });
        }

        const at = deps.clock.now();
        const siblings = await taskRepository.listByBranch(target.id);
        const order = siblings.reduce((max, row) => Math.max(max, row.order), 0) + 1;

        const row: Task = {
          id: deps.ids.ulid(at),
          ownerId: LOCAL_OWNER_ID,
          branchId: target.id,
          title,
          note: input.note?.trim() || null,
          status: 'open',
          dueDate,
          plannedDate,
          completedAt: null,
          completedCommitId: null,
          cancelledAt: null,
          order,
          rev: 1,
          createdAt: at,
          updatedAt: at,
          deletedAt: null,
        };

        await taskRepository.create(row);
        await syncBranchCounts(target.id, deps);
        await writeEvent(
          tx,
          'task.create',
          row.id,
          { taskId: row.id, branchId: row.branchId },
          deps,
        );

        return ok(row);
      },
    );
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
