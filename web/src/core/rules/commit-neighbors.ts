/**
 * 提交的前后节点（M05 §5 / OP-01）。
 *
 * 只在同一 `sourceBranchId` 的有效提交里找相邻项：合并后 `branchId` 可能
 * 变成父分支，但「前后」必须沿着原始来源排，不能把不同来源混成一条线。
 */

export interface NeighborCommitRow {
  id: string;
  sourceBranchId: string;
  at: number;
  voidedAt: number | null;
  deletedAt?: number | null;
}

export interface CommitNeighbors<T> {
  prev: T | null;
  next: T | null;
}

export function commitNeighbors<T extends NeighborCommitRow>(
  rows: readonly T[],
  current: NeighborCommitRow,
): CommitNeighbors<T> {
  const chain = rows
    .filter(
      (row) =>
        row.sourceBranchId === current.sourceBranchId &&
        row.voidedAt === null &&
        (row.deletedAt ?? null) === null,
    )
    .sort((a, b) => (a.at === b.at ? (a.id < b.id ? -1 : 1) : a.at - b.at));

  const index = chain.findIndex((row) => row.id === current.id);
  if (index >= 0) {
    return { prev: chain[index - 1] ?? null, next: chain[index + 1] ?? null };
  }

  // 当前提交已被撤销或被删：按 at 插入位置给出相邻项，仍不混入其他来源。
  const insertAt = chain.findIndex((row) => row.at >= current.at);
  const position = insertAt === -1 ? chain.length : insertAt;
  return { prev: chain[position - 1] ?? null, next: chain[position] ?? null };
}
