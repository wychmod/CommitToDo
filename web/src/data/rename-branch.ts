import { fail, ok, type Result } from '@/core/errors';
import { validateBranchTitle } from '@/core/rules/branch-name';
import { db, LOCAL_OWNER_ID } from './db';
import { defaultWriteDeps, type WriteDeps } from './deps';
import { writeEvent } from './events';
import { branchRepository } from './repositories';
import type { Branch } from './types';

export interface RenameBranchInput {
  branchId: string;
  title: string;
}

/**
 * 重命名分支（PRD B04）。
 *
 * 同级（含已归档）查重，重命名排除自身；已合并 / 已归档分支结构只读。
 * 名称未变化时不写库、不记事件。
 */
export async function renameBranch(
  input: RenameBranchInput,
  deps: WriteDeps = defaultWriteDeps,
): Promise<Result<Branch>> {
  const emptyName = validateBranchTitle({ title: input.title, siblings: [] });
  if (!emptyName.ok) {
    return fail('validation.title_empty', { field: 'title' });
  }

  try {
    return await db.transaction('rw', [db.branches, db.events], async (tx) => {
      const all = await branchRepository.listByOwner(LOCAL_OWNER_ID);
      const live = all.filter((branch) => branch.deletedAt === null);
      const branch = live.find((row) => row.id === input.branchId);

      if (!branch) {
        return fail('domain.not_found');
      }
      if (branch.archivedAt !== null || branch.status !== 'active') {
        return fail('domain.readonly_branch', { field: 'title' });
      }

      const siblings = live.filter((row) => row.parentId === branch.parentId);
      const name = validateBranchTitle({
        title: input.title,
        siblings,
        selfId: branch.id,
      });
      if (name.reason === 'duplicate') {
        return fail('domain.conflict', { field: 'title' });
      }

      if (name.title === branch.title) {
        return ok(branch);
      }

      const at = deps.clock.now();
      const next: Branch = {
        ...branch,
        title: name.title,
        rev: branch.rev + 1,
        updatedAt: at,
      };

      await branchRepository.put(next);
      await writeEvent(
        tx,
        'branch.rename',
        branch.id,
        { branchId: branch.id, from: branch.title, to: name.title },
        deps,
      );

      return ok(next);
    });
  } catch (cause) {
    return fail('storage.write_failed', { retriable: true, cause });
  }
}
