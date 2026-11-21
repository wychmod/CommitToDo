/**
 * 分支名额（PRD B02 / 边界 4）。
 *
 * 根下 ≤7、L2 下 ≤9、L3 下 ≤20，整棵树活跃分支 ≤200；
 * 计数只排除已归档与已删除，已合并 / 已放下但仍在默认树的分支照常计入。
 */

export const BRANCH_TREE_LIMIT = 200;

/** 下标即子分支深度：1 → 7，2 → 9，3 → 20。 */
export const BRANCH_CHILD_LIMITS: Readonly<Record<number, number>> = {
  1: 7,
  2: 9,
  3: 20,
};

export interface QuotaNode {
  /** 提供后按祖先链排除归档子树内的后代；缺省时只按自身状态计数。 */
  id?: string;
  parentId: string | null;
  depth: number;
  archivedAt: number | null;
  deletedAt: number | null;
}

export type QuotaBlockReason = 'parent-full' | 'tree-full' | 'depth-limit';

export interface CreateQuotaAssessment {
  allowed: boolean;
  reason: QuotaBlockReason | null;
  childDepth: number;
  used: number;
  limit: number;
  remaining: number;
  treeUsed: number;
  treeLimit: number;
}

/** 计入名额：未归档、未删除、且不是根。 */
export function isCountedBranch(node: QuotaNode): boolean {
  return node.depth >= 1 && node.archivedAt === null && node.deletedAt === null;
}

export function countActiveChildren(parentId: string, nodes: readonly QuotaNode[]): number {
  return nodes.filter((node) => node.parentId === parentId && isCountedBranch(node)).length;
}

/** 祖先链上是否有归档或删除；归档只写选中行，后代靠这里一起退出计数。 */
function hasHiddenAncestor(node: QuotaNode, byId: ReadonlyMap<string, QuotaNode>): boolean {
  if (typeof node.id !== 'string') return false;
  let current = node.parentId ? byId.get(node.parentId) : undefined;
  let guard = 0;
  while (current && guard < 32) {
    if (current.archivedAt !== null || current.deletedAt !== null) return true;
    current = current.parentId ? byId.get(current.parentId) : undefined;
    guard += 1;
  }
  return false;
}

export function countActiveBranches(nodes: readonly QuotaNode[]): number {
  const byId = new Map<string, QuotaNode>();
  for (const node of nodes) {
    if (typeof node.id === 'string') byId.set(node.id, node);
  }
  return nodes.filter((node) => isCountedBranch(node) && !hasHiddenAncestor(node, byId)).length;
}

/** 在父分支下新建子分支前的名额评估。 */
export function assessCreateQuota(
  parentId: string,
  parentDepth: number,
  nodes: readonly QuotaNode[],
): CreateQuotaAssessment {
  const childDepth = parentDepth + 1;
  const limit = BRANCH_CHILD_LIMITS[childDepth] ?? 0;
  const used = countActiveChildren(parentId, nodes);
  const treeUsed = countActiveBranches(nodes);
  const remaining = Math.max(0, limit - used);

  let reason: QuotaBlockReason | null = null;
  if (limit === 0) reason = 'depth-limit';
  else if (treeUsed >= BRANCH_TREE_LIMIT) reason = 'tree-full';
  else if (used >= limit) reason = 'parent-full';

  return {
    allowed: reason === null,
    reason,
    childDepth,
    used,
    limit,
    remaining,
    treeUsed,
    treeLimit: BRANCH_TREE_LIMIT,
  };
}

export interface RestoreQuotaAssessment {
  allowed: boolean;
  reason: QuotaBlockReason | null;
  childDepth: number;
  /** 恢复后该父分支下的已用名额（含待恢复分支自身）。 */
  used: number;
  limit: number;
  /** 恢复后的剩余名额；已满或超出时固定为 0。 */
  remaining: number;
  treeUsed: number;
  treeLimit: number;
}

/**
 * 取消归档前的名额评估（V1-01 / R16）。
 *
 * 归档分支当前不计入名额，所以「恢复后」= 现有计数 + 1；
 * 超出所在父的 L1/L2/L3 上限或全树 200 时不可用，剩余名额显示 0。
 */
export function assessRestoreQuota(
  parentId: string,
  parentDepth: number,
  nodes: readonly QuotaNode[],
): RestoreQuotaAssessment {
  const childDepth = parentDepth + 1;
  const limit = BRANCH_CHILD_LIMITS[childDepth] ?? 0;
  const used = countActiveChildren(parentId, nodes) + 1;
  const treeUsed = countActiveBranches(nodes) + 1;

  let reason: QuotaBlockReason | null = null;
  if (limit === 0) reason = 'depth-limit';
  else if (treeUsed > BRANCH_TREE_LIMIT) reason = 'tree-full';
  else if (used > limit) reason = 'parent-full';

  // 任一上限被突破时剩余名额固定显示 0（PRD §6 验收 13）。
  const remaining = reason === null ? Math.max(0, limit - used) : 0;

  return {
    allowed: reason === null,
    reason,
    childDepth,
    used,
    limit,
    remaining,
    treeUsed,
    treeLimit: BRANCH_TREE_LIMIT,
  };
}
