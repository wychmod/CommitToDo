import { fail, ok, type Result } from '@/core/errors';
import { branchTreeReadonlyReason } from '@/core/rules/branch-readonly';
import { db } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { writeEvent } from './events';
import { branchRepository } from './repositories';
import type { Branch } from './types';

export interface UpdateBranchGoalInput {
  branchId: string;
  goal: string | null;
}

/**
 * 就地编辑分支目标（PRD M04 OP-02）。
 *
 * 单表写入：`goal` 与 `updatedAt` 一起落库，并同事务写一条 `branch.update`。
 * 只读判定带祖先：自身状态之外，任一级祖先被归档或删除时也不可写。
 */
export async function updateBranchGoal(
  input: UpdateBranchGoalInput,
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<Branch>> {
  const goal = input.goal?.trim() || null;

  try {
    return await db.transaction('rw', [db.branches, db.events, db.outbox], async (tx) => {
      const branch = await branchRepository.getById(input.branchId);
      if (!branch || branch.deletedAt !== null) {
        return fail('domain.not_found', { field: 'branchId' });
      }

      const all = await branchRepository.listByOwner(branch.ownerId);
      const byId = new Map(all.map((row) => [row.id, row]));
      if (branchTreeReadonlyReason(branch, byId) !== null) {
        return fail('domain.readonly_branch', { field: 'branchId' });
      }

      if ((branch.goal ?? null) === goal) return ok(branch);

      const at = deps.clock.now();
      const next: Branch = {
        ...branch,
        goal,
        updatedAt: at,
        rev: branch.rev + 1,
      };
      await branchRepository.put(next);
      await writeEvent(
        tx,
        'branch.update',
        branch.id,
        { branchId: branch.id, fields: ['goal'] },
        deps,
      );

      return ok(next);
    });
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
