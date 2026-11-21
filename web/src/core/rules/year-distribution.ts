/**
 * 年轮 12 个月分布与一级分支占比（R11，PRD V1-02 §4.3–§4.4）。
 *
 * 统计全部现算：先把子分支提交归并到一级祖先，再按月计数；
 * 当前年尚未到来的月份返回空位（`null`），已到但无提交的月份返回 0。
 */

import { normalizeBranchColor } from './branch-color';
import {
  createLevelOneResolver,
  isYearCommit,
  type YearBranchRecord,
  type YearCommitRecord,
} from './year-metrics';

export interface YearMonthBucket {
  /** 1–12。 */
  month: number;
  /** `null` 表示该月尚未到来，页面画空位而不是 0 柱。 */
  count: number | null;
}

export interface YearBranchShare {
  /** 根分支上的提交归为一行，`branchId` 为 `null`。 */
  branchId: string | null;
  title: string;
  /** 一级分支的色相；「我」一行用中性色，值为 `null`。 */
  color: string | null;
  archived: boolean;
  commits: number;
  /** 0–1，各行之和为 1（四舍五入误差按百分比计不超过 1）。 */
  ratio: number;
  taskDone: number;
  taskTotal: number;
  createdAt: number;
}

export interface YearDistribution {
  months: YearMonthBucket[];
  total: number;
  /** 含「我」一行，按提交数降序。 */
  shares: YearBranchShare[];
  /** 只含一级分支，最多 5 条。 */
  top: YearBranchShare[];
}

export interface YearDistributionBranch extends YearBranchRecord {
  title: string;
  color: string;
  archivedAt: number | null;
  taskDone: number;
  taskTotal: number;
}

export interface YearDistributionInput {
  year: number;
  commits: readonly YearCommitRecord[];
  branches: readonly YearDistributionBranch[];
  /** 本地当天，`YYYY-MM-DD`。 */
  todayDate: string;
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function buildYearDistribution(input: YearDistributionInput): YearDistribution {
  const { year, todayDate } = input;
  const todayYear = Number(todayDate.slice(0, 4));
  const todayMonth = Number(todayDate.slice(5, 7));
  const resolve = createLevelOneResolver(input.branches);
  const byId = new Map(input.branches.map((branch) => [branch.id, branch]));

  const monthly = new Map<number, number>();
  const grouped = new Map<string | null, number>();
  let total = 0;

  for (const commit of input.commits) {
    if (!isYearCommit(commit, year)) continue;
    total += 1;
    const month = Number(commit.date.slice(5, 7));
    monthly.set(month, (monthly.get(month) ?? 0) + 1);
    const levelOne = resolve(commit.branchId);
    grouped.set(levelOne, (grouped.get(levelOne) ?? 0) + 1);
  }

  const months: YearMonthBucket[] = MONTHS.map((month) => {
    const notReached = year > todayYear || (year === todayYear && month > todayMonth);
    if (notReached) return { month, count: null };
    return { month, count: monthly.get(month) ?? 0 };
  });

  const root = input.branches.find(
    (branch) => branch.parentId === null && branch.deletedAt === null,
  );
  const shares: YearBranchShare[] = [];

  for (const [branchId, commits] of grouped) {
    const branch = branchId === null ? root : byId.get(branchId);
    if (branchId !== null && !branch) continue;
    shares.push({
      branchId,
      title: branch?.title ?? '',
      color: branchId === null ? null : normalizeBranchColor(branch?.color),
      archived: branchId !== null && (branch?.archivedAt ?? null) !== null,
      commits,
      ratio: total === 0 ? 0 : commits / total,
      taskDone: branch?.taskDone ?? 0,
      taskTotal: branch?.taskTotal ?? 0,
      createdAt: branch?.createdAt ?? 0,
    });
  }

  shares.sort(
    (left, right) =>
      right.commits - left.commits ||
      left.createdAt - right.createdAt ||
      (left.branchId ?? '').localeCompare(right.branchId ?? ''),
  );

  return {
    months,
    total,
    shares,
    top: shares.filter((share) => share.branchId !== null).slice(0, 5),
  };
}
