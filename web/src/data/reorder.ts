import { fail, ok, type Result } from '@/core/errors';
import { sequentialOrders } from '@/core/rules/drag-order';
import { todayGroupKey, type TodayGroupKey } from '@/core/rules/today-groups';
import { db, LOCAL_OWNER_ID } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { branchRepository, taskRepository } from './repositories';
import type { Branch } from './types';

/** 测试用故障注入：写到第 N 行后抛错，验证事务整体回滚。 */
export interface ReorderDeps extends WriteDeps {
  failAfterWrites?: number;
}

export interface ReorderTasksInput {
  groupKey: TodayGroupKey;
  orderedIds: string[];
  todayDate: string;
}

export interface ReorderBranchesInput {
  parentId: string;
  orderedIds: string[];
}

function unique(ids: readonly string[]): boolean {
  return new Set(ids).size === ids.length;
}

/**
 * 今天组内的拖拽排序（PRD V1-08 OP-01）。
 *
 * 只接受同属一个今天组、仍为 open 且未删除的待办；任一条不满足就整批拒绝。
 * 所有 `order` 在同一事务内写成 1..n，失败回滚到拖拽前。
 */
export async function reorderTasks(
  input: ReorderTasksInput,
  deps: ReorderDeps = defaultWriteDeps,
): Promise<Result<{ groupKey: TodayGroupKey }>> {
  if (input.orderedIds.length < 2 || !unique(input.orderedIds)) {
    return fail('validation.invalid_input', { field: 'orderedIds', retriable: false });
  }

  try {
    return await db.transaction('rw', [db.tasks], async () => {
      const rows = await db.tasks.bulkGet(input.orderedIds);
      let written = 0;
      for (const row of rows) {
        if (!row || row.ownerId !== LOCAL_OWNER_ID) {
          return fail('domain.not_found', { field: 'taskId' });
        }
        if (todayGroupKey(row, input.todayDate) !== input.groupKey) {
          return fail('validation.invalid_input', { field: 'group', retriable: false });
        }
      }

      const at = deps.clock.now();
      for (const { id, order } of sequentialOrders(input.orderedIds)) {
        const row = rows.find((item) => item?.id === id);
        if (!row) return fail('domain.not_found', { field: 'taskId' });
        await taskRepository.update(id, { order, updatedAt: at }, row.rev);
        written += 1;
        if (deps.failAfterWrites !== undefined && written === deps.failAfterWrites) {
          throw new Error('reorder failure');
        }
      }
      return ok({ groupKey: input.groupKey });
    });
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}

/**
 * 分支树同父兄弟的拖拽排序（PRD V1-08 OP-07）。
 *
 * 根分支、归档子树与跨父请求一律拒绝；`pinnedAt` 不动，只重写 `order`。
 */
export async function reorderBranches(
  input: ReorderBranchesInput,
  deps: ReorderDeps = defaultWriteDeps,
): Promise<Result<{ parentId: string }>> {
  if (input.orderedIds.length < 2 || !unique(input.orderedIds)) {
    return fail('validation.invalid_input', { field: 'orderedIds', retriable: false });
  }

  try {
    return await db.transaction('rw', [db.branches], async () => {
      const rows = await db.branches.bulkGet(input.orderedIds);
      for (const row of rows) {
        if (!row || row.ownerId !== LOCAL_OWNER_ID) {
          return fail('domain.not_found', { field: 'branchId' });
        }
        if (
          row.parentId !== input.parentId ||
          row.depth === 0 ||
          row.deletedAt !== null ||
          row.archivedAt !== null
        ) {
          return fail('validation.invalid_input', { field: 'parentId', retriable: false });
        }
      }

      const at = deps.clock.now();
      let written = 0;
      for (const { id, order } of sequentialOrders(input.orderedIds)) {
        const row = rows.find((item) => item?.id === id);
        if (!row) return fail('domain.not_found', { field: 'branchId' });
        await branchRepository.put({ ...row, order, updatedAt: at, rev: row.rev + 1 });
        written += 1;
        if (deps.failAfterWrites !== undefined && written === deps.failAfterWrites) {
          throw new Error('reorder failure');
        }
      }
      return ok({ parentId: input.parentId });
    });
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}

/**
 * 置顶 / 取消置顶（PRD V1-08 OP-04）。
 *
 * 只写 `branches.pinnedAt` 与 `updatedAt`，不动 `order`，也不写 events。
 */
export async function setBranchPinned(
  input: { branchId: string; pinned: boolean },
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<Branch>> {
  try {
    return await db.transaction('rw', [db.branches], async () => {
      const row = await branchRepository.getById(input.branchId);
      if (!row || row.ownerId !== LOCAL_OWNER_ID) {
        return fail('domain.not_found', { field: 'branchId' });
      }
      if (row.depth === 0 || row.deletedAt !== null || row.archivedAt !== null) {
        return fail('domain.readonly_branch', { field: 'branchId' });
      }

      const at = deps.clock.now();
      const next: Branch = {
        ...row,
        pinnedAt: input.pinned ? at : null,
        updatedAt: at,
        rev: row.rev + 1,
      };
      await branchRepository.put(next);
      return ok(next);
    });
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
