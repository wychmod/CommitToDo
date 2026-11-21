/**
 * 分支可写性与只读原因（R8 / R14 / R15 / M03 §4.5）。
 *
 * 只做纯判断：待办的编辑、完成、安排与取消都要先过这里；
 * 页面用同一个函数给出只读原因，避免「行上可点、详情不能存」。
 */

export type BranchState = 'active' | 'merged' | 'dropped';

export interface BranchStateLike {
  status: BranchState;
  archivedAt: number | null;
  deletedAt?: number | null;
}

export type BranchReadonlyReason = 'deleted' | 'archived' | 'merged' | 'dropped';

/** 只读原因；可写时返回 null。软删优先于归档，归档优先于生命周期状态。 */
export function branchReadonlyReason(branch: BranchStateLike): BranchReadonlyReason | null {
  if (branch.deletedAt) return 'deleted';
  if (branch.archivedAt !== null) return 'archived';
  if (branch.status === 'dropped') return 'dropped';
  if (branch.status === 'merged') return 'merged';
  return null;
}

/** 能否接收新待办或编辑：只有进行中、未归档、未删除的分支。 */
export function isBranchAccepting(branch: BranchStateLike): boolean {
  return branchReadonlyReason(branch) === null;
}
