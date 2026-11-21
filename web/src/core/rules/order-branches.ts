/**
 * 分支树的置顶与兄弟顺序（PRD V1-08 OP-04 / OP-07）。
 *
 * 显示顺序：未归档、未删除的置顶项在前（最近置顶优先），其余按 `order` 升序，
 * `order` 相同再用创建时间兜底。根分支不可置顶，归档子树不参与排序。
 */

export interface OrderableBranch {
  id: string;
  parentId: string | null;
  depth: number;
  order: number;
  pinnedAt?: number | null;
  archivedAt: number | null;
  deletedAt?: number | null;
  createdAt: number;
}

function pinnedRank(branch: OrderableBranch): number {
  return branch.pinnedAt ?? Number.NEGATIVE_INFINITY;
}

export function isBranchPinned(branch: OrderableBranch): boolean {
  return branch.pinnedAt !== null && branch.pinnedAt !== undefined;
}

export function canPinBranch(branch: OrderableBranch): boolean {
  if (branch.depth === 0) return false;
  if (branch.deletedAt) return false;
  return branch.archivedAt === null;
}

/** 同一父下的显示顺序：置顶区在前，普通区沿用 order。 */
export function sortSiblingBranches<T extends OrderableBranch>(rows: readonly T[]): T[] {
  const visible = rows.filter((row) => !row.deletedAt && row.archivedAt === null);
  const pinned = visible
    .filter(isBranchPinned)
    .sort(
      (left, right) =>
        pinnedRank(right) - pinnedRank(left) ||
        left.createdAt - right.createdAt ||
        left.id.localeCompare(right.id),
    );
  const rest = visible
    .filter((row) => !isBranchPinned(row))
    .sort(
      (left, right) =>
        left.order - right.order ||
        left.createdAt - right.createdAt ||
        left.id.localeCompare(right.id),
    );
  return [...pinned, ...rest];
}

/** 新分支追加到兄弟末尾；置顶不改变 order，取消置顶后回到原来的相对位置。 */
export function nextBranchOrder(rows: readonly OrderableBranch[]): number {
  return rows.reduce((max, row) => Math.max(max, row.order), 0) + 1;
}
