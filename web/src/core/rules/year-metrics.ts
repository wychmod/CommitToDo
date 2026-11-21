/**
 * 年轮四项指标（R3 / R11，PRD V1-02 §4.2）。
 *
 * 提交按业务日期 `date` 的 `YYYY` 归年；新开与收尾按写入时记录的本地日期归年。
 * 子分支提交归并到一级祖先后再去重，因此「活跃一级分支数」不会被多层结构骗过。
 */

import { toLocalDate } from '@/core/clock';

type YearBranchStatus = 'active' | 'merged' | 'dropped';

export interface YearCommitRecord {
  branchId: string;
  /** 业务日期，`YYYY-MM-DD`。 */
  date: string;
  voidedAt: number | null;
  deletedAt?: number | null;
}

export interface YearBranchRecord {
  id: string;
  parentId: string | null;
  depth: number;
  status: YearBranchStatus;
  createdAt: number;
  finishedAt: number | null;
  deletedAt: number | null;
}

export interface YearMetrics {
  commits: number;
  activeLevelOneBranches: number;
  opened: number;
  finished: number;
}

/** 该提交是否属于给定年份、且仍有效（R3）。 */
export function isYearCommit(commit: YearCommitRecord, year: number): boolean {
  if (commit.voidedAt !== null) return false;
  if ((commit.deletedAt ?? null) !== null) return false;
  return commit.date.slice(0, 4) === String(year);
}

/** 把 UTC 毫秒按本地偏移换算成年份。 */
export function localYearOf(epochMs: number, tzOffsetMinutes: number): number {
  return Number(toLocalDate(epochMs, tzOffsetMinutes).slice(0, 4));
}

export type LevelOneResolver = (branchId: string) => string | null;

/**
 * 沿 `parentId` 上溯到 `depth = 1` 的分支。
 *
 * 根分支上的提交返回 `null`（年轮里归入「我」一行，不计入活跃一级分支数）。
 * 找不到分支或链路成环时同样返回 `null`，不抛错。
 */
export function createLevelOneResolver(branches: readonly YearBranchRecord[]): LevelOneResolver {
  const byId = new Map(branches.map((branch) => [branch.id, branch]));
  return (branchId) => {
    let cursor = byId.get(branchId);
    const seen = new Set<string>();
    while (cursor) {
      if (seen.has(cursor.id)) return null;
      seen.add(cursor.id);
      if (cursor.parentId === null || cursor.depth === 0) return null;
      if (cursor.depth === 1) return cursor.id;
      cursor = byId.get(cursor.parentId);
    }
    return null;
  };
}

export interface YearMetricsInput {
  year: number;
  commits: readonly YearCommitRecord[];
  branches: readonly YearBranchRecord[];
  tzOffsetMinutes: number;
}

/** 现算四项指标，不读任何缓存值。 */
export function computeYearMetrics(input: YearMetricsInput): YearMetrics {
  const { year, branches, tzOffsetMinutes } = input;
  const resolve = createLevelOneResolver(branches);

  let commitCount = 0;
  const active = new Set<string>();
  for (const commit of input.commits) {
    if (!isYearCommit(commit, year)) continue;
    commitCount += 1;
    const levelOne = resolve(commit.branchId);
    if (levelOne !== null) active.add(levelOne);
  }

  let opened = 0;
  let finished = 0;
  for (const branch of branches) {
    if (branch.deletedAt !== null) continue;
    // 根分支不参与「新开」（M02 口径）。
    if (branch.depth > 0 && localYearOf(branch.createdAt, tzOffsetMinutes) === year) {
      opened += 1;
    }
    if (
      branch.status === 'merged' &&
      branch.finishedAt !== null &&
      localYearOf(branch.finishedAt, tzOffsetMinutes) === year
    ) {
      finished += 1;
    }
  }

  return {
    commits: commitCount,
    activeLevelOneBranches: active.size,
    opened,
    finished,
  };
}
