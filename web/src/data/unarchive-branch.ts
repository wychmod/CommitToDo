import { fail, ok, type Result } from '@/core/errors';
import { assessUnarchive } from '@/core/rules/branch-lifecycle';
import { collectSubtree } from '@/core/rules/branch-path';
import { assessRestoreQuota } from '@/core/rules/branch-quota';
import { db, LOCAL_OWNER_ID } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { writeEvent } from './events';
import { lifecycleErrorCode } from './pause-branch';
import { branchRepository } from './repositories';
import type { Branch } from './types';

export interface UnarchiveBranchInput {
  branchId: string;
}

/**
 * 取消归档（V1-01 OP-04 / R14 / R16）。
 *
 * 前置：祖先链上没有仍归档的分支；恢复后不超出 L1/L2/L3 与全树 200。
 * 只清 `archivedAt`，`status` 不变；单独归档过的后代保持归档。
 */
export async function unarchiveBranch(
  input: UnarchiveBranchInput,
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<Branch>> {
  try {
    return await db.transaction('rw', [db.branches, db.events, db.outbox], async (tx) => {
      const all = await branchRepository.listByOwner(LOCAL_OWNER_ID);
      const live = all.filter((branch) => branch.deletedAt === null);
      const subject = live.find((branch) => branch.id === input.branchId);
      if (!subject) return fail('domain.not_found', { field: 'branchId' });

      const byId = new Map(live.map((row) => [row.id, row]));
      const assessment = assessUnarchive(subject, byId);
      if (!assessment.allowed) {
        return fail(lifecycleErrorCode(assessment.reason ?? 'archived'), { field: 'branchId' });
      }

      const parent = subject.parentId ? byId.get(subject.parentId) : undefined;
      if (!parent) return fail('domain.not_found', { field: 'parentId' });
      const quota = assessRestoreQuota(parent.id, parent.depth, live);
      if (!quota.allowed) return fail('domain.quota_exceeded', { field: 'parentId' });

      const at = deps.clock.now();
      const next: Branch = {
        ...subject,
        archivedAt: null,
        rev: subject.rev + 1,
        updatedAt: at,
      };
      await branchRepository.put(next);
      await writeEvent(
        tx,
        'branch.unarchive',
        subject.id,
        { branchId: subject.id, subtreeCount: collectSubtree(live, subject.path).length },
        deps,
      );
      return ok(next);
    });
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
