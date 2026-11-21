/**
 * 删除空分支守卫（TECH §5.3.3 R13 / PRD M08 OP-06）。
 *
 * 只有整棵子树没有待办、提交、里程碑与子分支，且自身仍是进行中、无归档/收尾/
 * 放下/纠错记录时才可物理删除；根分支恒不可删。返回逐条原因，供确认框与菜单使用。
 */

export type DeleteLifecycle = 'active' | 'merged' | 'dropped';

export interface DeleteNode {
  id: string;
  path: string;
  depth: number;
  status: DeleteLifecycle;
  archivedAt: number | null;
  finishedAt?: number | null;
  droppedAt?: number | null;
  deletedAt?: number | null;
}

export type DeleteBlockReason =
  | 'root'
  | 'deleted'
  | 'archived'
  | 'merged'
  | 'dropped'
  | 'has-tasks'
  | 'has-commits'
  | 'has-milestones'
  | 'has-children'
  | 'has-history';

export interface DeleteGuardInput {
  subject: DeleteNode;
  /** 整棵子树（含自身），由 `collectSubtree` 产出。 */
  subtree: readonly DeleteNode[];
  tasks: readonly { branchId: string; deletedAt?: number | null }[];
  commits: readonly { branchId: string; deletedAt?: number | null }[];
  milestones: readonly { branchId: string; deletedAt?: number | null }[];
  /** 子树内的历史事件，用于识别收尾、放下与纠错痕迹。 */
  events?: readonly { entityId: string; action: string }[];
}

export interface DeleteGuard {
  allowed: boolean;
  /** 逐条原因；可删除时为空数组。 */
  reasons: DeleteBlockReason[];
  /** 将被物理删除的分支行 id（含自身与后代）。 */
  subtreeIds: string[];
}

const HISTORY_ACTIONS = new Set([
  'branch.finish',
  'branch.pause',
  'branch.archive',
  'branch.unarchive',
  'commit.void',
]);

const isLive = (row: { deletedAt?: number | null }): boolean => !row.deletedAt;

export function assessDelete(input: DeleteGuardInput): DeleteGuard {
  const { subject } = input;
  const subtreeIds = input.subtree.map((node) => node.id);
  const ids = new Set(subtreeIds);
  const reasons: DeleteBlockReason[] = [];

  if (subject.deletedAt) reasons.push('deleted');
  if (subject.depth === 0) reasons.push('root');
  if (subject.archivedAt !== null) reasons.push('archived');
  if (subject.status === 'merged' || subject.finishedAt) reasons.push('merged');
  if (subject.status === 'dropped' || subject.droppedAt) reasons.push('dropped');

  const liveSubtree = input.subtree.filter(isLive);
  if (liveSubtree.some((node) => node.id !== subject.id)) reasons.push('has-children');
  if (input.tasks.some((row) => ids.has(row.branchId) && isLive(row))) reasons.push('has-tasks');
  if (input.commits.some((row) => ids.has(row.branchId) && isLive(row))) {
    reasons.push('has-commits');
  }
  if (input.milestones.some((row) => ids.has(row.branchId) && isLive(row))) {
    reasons.push('has-milestones');
  }
  if (input.events?.some((row) => ids.has(row.entityId) && HISTORY_ACTIONS.has(row.action))) {
    reasons.push('has-history');
  }

  return { allowed: reasons.length === 0, reasons, subtreeIds };
}
