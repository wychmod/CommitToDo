/**
 * 分支提交流（R3 / M04 §4.3）。
 *
 * 只保留有效提交（`voidedAt` 与 `deletedAt` 均为空），按业务日期倒序；
 * 同一天多条时按实际时刻倒序，保证分页稳定、跨页不重不漏。
 */

export const COMMIT_PAGE_SIZE = 20;

export interface CommitFeedRow {
  branchId: string;
  sourceBranchId: string;
  date: string;
  at: number;
  voidedAt: number | null;
  deletedAt?: number | null;
}

export interface CommitFeedPage<T> {
  items: T[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export function isValidCommit(row: CommitFeedRow): boolean {
  return row.voidedAt === null && (row.deletedAt ?? null) === null;
}

export function sortCommitFeed<T extends CommitFeedRow>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => (a.date === b.date ? b.at - a.at : b.date < b.date ? 1 : -1));
}

/** 某分支的有效提交流；合并后子分支提交已并入父分支，来源只用于标注。 */
export function branchCommitFeed<T extends CommitFeedRow>(
  rows: readonly T[],
  branchId: string,
): T[] {
  return sortCommitFeed(rows.filter((row) => row.branchId === branchId && isValidCommit(row)));
}

export function commitFeedPage<T>(
  feed: readonly T[],
  page: number,
  pageSize: number = COMMIT_PAGE_SIZE,
): CommitFeedPage<T> {
  const safePage = Math.max(1, Math.floor(page));
  const start = (safePage - 1) * pageSize;
  return {
    items: feed.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    hasMore: start + pageSize < feed.length,
  };
}

/** 合并后 `sourceBranchId` 保留原分支，与当前分支不同即需要「来自 X」标注。 */
export function isIncomingCommit(row: CommitFeedRow, branchId: string): boolean {
  return row.sourceBranchId !== branchId;
}
