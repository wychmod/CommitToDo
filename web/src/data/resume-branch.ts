import { fail, ok, type Result } from '@/core/errors';
import { assessResume } from '@/core/rules/branch-lifecycle';
import { db, LOCAL_OWNER_ID } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { writeEvent } from './events';
import { lifecycleErrorCode } from './pause-branch';
import { branchRepository } from './repositories';
import type { Branch } from './types';

export interface ResumeBranchInput {
  branchId: string;
}

/**
 * 重新开始分支（V1-01 OP-02 / R15）。
 *
 * 只把 `status` 改回 `active`；`droppedAt` / `dropReason` 保留供「上次放下」展示。
 * 待办不改归属与日期，由 R8 按原 `dueDate` / `plannedDate` 重新进入今天三组。
 */
export async function resumeBranch(
  input: ResumeBranchInput,
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<Branch>> {
  try {
    return await db.transaction('rw', [db.branches, db.events], async (tx) => {
      const all = await branchRepository.listByOwner(LOCAL_OWNER_ID);
      const live = all.filter((branch) => branch.deletedAt === null);
      const subject = live.find((branch) => branch.id === input.branchId);
      if (!subject) return fail('domain.not_found', { field: 'branchId' });

      const byId = new Map(live.map((row) => [row.id, row]));
      const assessment = assessResume(subject, byId);
      if (!assessment.allowed) {
        return fail(lifecycleErrorCode(assessment.reason ?? 'archived'), { field: 'branchId' });
      }

      const at = deps.clock.now();
      const next: Branch = {
        ...subject,
        status: 'active',
        rev: subject.rev + 1,
        updatedAt: at,
      };
      await branchRepository.put(next);
      await writeEvent(tx, 'branch.resume', subject.id, { branchId: subject.id }, deps);
      return ok(next);
    });
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
