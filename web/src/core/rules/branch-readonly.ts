import { branchReadonlyReason, type BranchReadonlyReason } from './branch-state';

/**
 * 分支只读判定（M04 §5 / §8.2）。
 *
 * 自身状态之外，任一级祖先被删除或归档时整棵子树只读：
 * 否则从子分支详情仍能编辑目标、加待办，绕过归档的「只读」。
 */
export interface BranchAncestorNode {
  id: string;
  parentId: string | null;
  status: 'active' | 'merged' | 'dropped';
  archivedAt: number | null;
  deletedAt?: number | null;
}

export function branchTreeReadonlyReason(
  branch: BranchAncestorNode,
  byId: ReadonlyMap<string, BranchAncestorNode>,
): BranchReadonlyReason | null {
  const own = branchReadonlyReason(branch);
  if (own) return own;

  let current = branch.parentId ? byId.get(branch.parentId) : undefined;
  let guard = 0;
  while (current && guard < 32) {
    if (current.deletedAt) return 'deleted';
    if (current.archivedAt !== null) return 'archived';
    current = current.parentId ? byId.get(current.parentId) : undefined;
    guard += 1;
  }
  return null;
}
