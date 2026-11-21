/**
 * 分支生命周期动作（V1-01 / R14 / R15）。
 *
 * 纯判断：放下、重新开始、归档、取消归档的入口可用性与不可用原因。
 * 写入、事件与额度校验由 `data` 用例按这里的结论执行，页面只用同一份结论。
 */

import { isDescendantPath } from './branch-path';

export type LifecycleStatus = 'active' | 'merged' | 'dropped';

export interface LifecycleBranch {
  id: string;
  parentId: string | null;
  path: string;
  depth: number;
  status: LifecycleStatus;
  archivedAt: number | null;
  deletedAt?: number | null;
}

export interface LifecycleAssessment<R extends string> {
  allowed: boolean;
  reason: R | null;
}

export type PauseBlockReason = 'root' | 'deleted' | 'archived' | 'merged' | 'dropped';
export type ResumeBlockReason =
  'root' | 'deleted' | 'not-dropped' | 'archived' | 'ancestor-archived' | 'ancestor-merged';
export type ArchiveBlockReason = 'root' | 'deleted' | 'archived' | 'active' | 'active-descendants';
export type UnarchiveBlockReason = 'deleted' | 'not-archived' | 'ancestor-archived';

function blocked<R extends string>(reason: R): LifecycleAssessment<R> {
  return { allowed: false, reason };
}

const ALLOWED: LifecycleAssessment<never> = { allowed: true, reason: null };

function ancestorChain(
  branch: LifecycleBranch,
  byId: ReadonlyMap<string, LifecycleBranch>,
): LifecycleBranch[] {
  const chain: LifecycleBranch[] = [];
  let current = branch.parentId ? byId.get(branch.parentId) : undefined;
  let guard = 0;
  while (current && guard < 32) {
    chain.push(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
    guard += 1;
  }
  return chain;
}

/** 放下原因规整：首尾空白不计入必填校验。 */
export function normalizeDropReason(reason: string): string {
  return reason.trim();
}

export function isDropReasonValid(reason: string): boolean {
  return normalizeDropReason(reason).length > 0;
}

/** 能否放下：根、已合并、已归档、已放下的分支都不提供该动作。 */
export function assessPause(
  branch: LifecycleBranch,
  _byId: ReadonlyMap<string, LifecycleBranch>,
): LifecycleAssessment<PauseBlockReason> {
  if (branch.deletedAt) return blocked('deleted');
  if (branch.depth === 0) return blocked('root');
  if (branch.archivedAt !== null) return blocked('archived');
  if (branch.status === 'merged') return blocked('merged');
  if (branch.status === 'dropped') return blocked('dropped');
  return ALLOWED;
}

/** 能否重新开始：只有已放下、自身与祖先都未被归档、祖先没有已合并。 */
export function assessResume(
  branch: LifecycleBranch,
  byId: ReadonlyMap<string, LifecycleBranch>,
): LifecycleAssessment<ResumeBlockReason> {
  if (branch.deletedAt) return blocked('deleted');
  if (branch.depth === 0) return blocked('root');
  if (branch.archivedAt !== null) return blocked('archived');
  if (branch.status !== 'dropped') return blocked('not-dropped');

  const ancestors = ancestorChain(branch, byId);
  if (ancestors.some((item) => item.deletedAt)) return blocked('deleted');
  if (ancestors.some((item) => item.archivedAt !== null)) return blocked('ancestor-archived');
  if (ancestors.some((item) => item.status === 'merged')) return blocked('ancestor-merged');
  return ALLOWED;
}

/** 能否归档：只有已合并或已放下、未归档、且子树里没有进行中分支。 */
export function assessArchive(
  branch: LifecycleBranch,
  byId: ReadonlyMap<string, LifecycleBranch>,
): LifecycleAssessment<ArchiveBlockReason> {
  if (branch.deletedAt) return blocked('deleted');
  if (branch.depth === 0) return blocked('root');
  if (branch.archivedAt !== null) return blocked('archived');
  if (branch.status === 'active') return blocked('active');

  for (const node of byId.values()) {
    if (node.id === branch.id || node.deletedAt) continue;
    if (node.status !== 'active') continue;
    if (isDescendantPath(node.path, branch.path)) return blocked('active-descendants');
  }
  return ALLOWED;
}

/** 能否取消归档：自身已归档，且祖先链上没有仍归档的分支。 */
export function assessUnarchive(
  branch: LifecycleBranch,
  byId: ReadonlyMap<string, LifecycleBranch>,
): LifecycleAssessment<UnarchiveBlockReason> {
  if (branch.deletedAt) return blocked('deleted');
  if (branch.archivedAt === null) return blocked('not-archived');
  if (ancestorChain(branch, byId).some((item) => item.archivedAt !== null)) {
    return blocked('ancestor-archived');
  }
  return ALLOWED;
}
