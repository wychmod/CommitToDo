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

export function countActiveBranches(nodes: readonly QuotaNode[]): number {
  return nodes.filter(isCountedBranch).length;
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
