import { fail, ok, type Result } from '@/core/errors';
import { assessArchive } from '@/core/rules/branch-lifecycle';
import { collectSubtree } from '@/core/rules/branch-path';
import { db, LOCAL_OWNER_ID } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { writeEvent } from './events';
import { lifecycleErrorCode } from './pause-branch';
import { branchRepository } from './repositories';
import type { Branch } from './types';

export interface ArchiveBranchInput {
  branchId: string;
}

/**
 * 手动归档分支（V1-01 OP-03 / R14）。
 *
 * 只写选中分支的 `archivedAt`，`status` 不变；后代随祖先不可见，
 * 不批量写归档标记，所以取消归档后未被单独归档的后代会自动恢复。
 * 归档后不计入额度与停滞，历史、提交、里程碑与统计保留。
 */
export async function archiveBranch(
  input: ArchiveBranchInput,
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<Branch>> {
  try {
    return await db.transaction('rw', [db.branches, db.events, db.outbox], async (tx) => {
      const all = await branchRepository.listByOwner(LOCAL_OWNER_ID);
      const live = all.filter((branch) => branch.deletedAt === null);
      const subject = live.find((branch) => branch.id === input.branchId);
      if (!subject) return fail('domain.not_found', { field: 'branchId' });

      const byId = new Map(live.map((row) => [row.id, row]));
      const assessment = assessArchive(subject, byId);
      if (!assessment.allowed) {
        return fail(lifecycleErrorCode(assessment.reason ?? 'active'), { field: 'branchId' });
      }

      const at = deps.clock.now();
      const next: Branch = {
        ...subject,
        archivedAt: at,
        rev: subject.rev + 1,
        updatedAt: at,
      };
      await branchRepository.put(next);
      await writeEvent(
        tx,
        'branch.archive',
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
