import { fail, ok, type Result } from '@/core/errors';
import { branchTreeReadonlyReason } from '@/core/rules/branch-readonly';
import { branchRepository } from './repositories';
import type { Branch } from './types';

/**
 * 用例侧的写准入（M03 §4.5 / M04 §8.2）。
 *
 * 只调 `isBranchAccepting` 看自身状态是不够的：祖先被归档、合并或删除时，
 * 整棵子树都只读，否则从分支详情仍能完成待办、加待办，绕过归档的只读语义。
 * 所有写待办的用例都从这里取目标分支，保证判定只有一份实现。
 *
 * 只能在用例的事务内调用（内部走仓储，事务外会抛 `assertInTransaction`）。
 */
export async function requireWritableBranch(branchId: string): Promise<Result<Branch>> {
  const branch = await branchRepository.getById(branchId);
  if (!branch || branch.deletedAt !== null) {
    return fail('domain.not_found', { field: 'branchId' });
  }
  const all = await branchRepository.listByOwner(branch.ownerId);
  const byId = new Map(all.map((row) => [row.id, row]));
  if (branchTreeReadonlyReason(branch, byId) !== null) {
    return fail('domain.readonly_branch', { field: 'branchId' });
  }
  return ok(branch);
}
