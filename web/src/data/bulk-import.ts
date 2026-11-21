import { fail, ok, type Result } from '@/core/errors';
import { BULK_IMPORT_MAX } from '@/core/rules/bulk-import';
import { isBranchAccepting } from '@/core/rules/branch-state';
import { syncBranchCounts } from './branch-counts';
import { db, LOCAL_OWNER_ID } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { writeEvent } from './events';
import { branchRepository, taskRepository } from './repositories';
import type { Task } from './types';

export interface BulkImportInput {
  /** 已按行拆好的标题；调用方负责预览与删除。 */
  titles: string[];
  branchId: string;
}

export interface BulkImportOutput {
  branchId: string;
  tasks: Task[];
}

/**
 * 批量导入待办（PRD V1-07 B-02 / OP-03）。
 *
 * 一次导入的所有待办在同一事务内创建，任一条失败全部回滚；
 * 每条 `status=open`、无截止与安排日期，四计数按导入后的正文重算。
 */
export async function bulkImportTasks(
  input: BulkImportInput,
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<BulkImportOutput>> {
  const titles = input.titles.map((title) => title.trim());
  if (titles.length === 0) {
    return fail('validation.title_empty', { field: 'title' });
  }
  if (titles.some((title) => title.length === 0)) {
    return fail('validation.title_empty', { field: 'title' });
  }
  if (titles.length > BULK_IMPORT_MAX) {
    return fail('validation.invalid_input', { field: 'titles', retriable: false });
  }

  try {
    return await db.transaction(
      'rw',
      [db.branches, db.tasks, db.commits, db.events, db.outbox],
      async (tx) => {
        const branches = await branchRepository.listByOwner(LOCAL_OWNER_ID);
        const target = branches.find(
          (branch) => branch.id === input.branchId && branch.deletedAt === null,
        );
        if (!target) {
          return fail('domain.not_found', { field: 'branchId' });
        }
        if (!isBranchAccepting(target)) {
          return fail('domain.readonly_branch', { field: 'branchId' });
        }

        const at = deps.clock.now();
        const siblings = await taskRepository.listByBranch(target.id);
        let order = siblings.reduce((max, row) => Math.max(max, row.order), 0);
        const created: Task[] = [];

        for (const title of titles) {
          order += 1;
          const row: Task = {
            id: deps.ids.ulid(at),
            ownerId: LOCAL_OWNER_ID,
            branchId: target.id,
            title,
            note: null,
            status: 'open',
            dueDate: null,
            plannedDate: null,
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
          await writeEvent(
            tx,
            'task.create',
            row.id,
            { taskId: row.id, branchId: target.id, source: 'bulk' },
            deps,
          );
          created.push(row);
        }

        await syncBranchCounts(target.id, deps);
        return ok({ branchId: target.id, tasks: created });
      },
    );
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
