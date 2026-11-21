/**
 * 月回顾（R10，PRD V1-03 §4.3）。
 *
 * 提交按业务日期归月并归并到一级祖先；结构读本地时间字段；
 * 停滞计算前先截断到月末，之后新增的提交不会改写历史月份。
 */

import { toLocalDate } from '@/core/clock';
import { createLevelOneResolver, isYearCommit, type YearCommitRecord } from './year-metrics';
import type { YearDistributionBranch } from './year-distribution';
import { stallReminders, type StallBranch } from './stagnation';
import { weekStartOf } from './week-review';

export interface MonthReviewCommit extends YearCommitRecord {
  id: string;
  at: number;
}

export interface MonthReviewBranch extends YearDistributionBranch, StallBranch {}

export interface MonthBranchShare {
  branchId: string | null;
  title: string;
  commits: number;
  ratio: number;
  /** 与前一月占比的差，0–1；前一月无提交时为 null。 */
  delta: number | null;
  direction: 'up' | 'down' | null;
}

export type MonthObservation =
  | { type: 'empty' }
  | { type: 'concentrated' | 'balanced'; branchId: string | null; ratio: number }
  | { type: 'continuity'; branchId: string; weeks: number }
  | { type: 'structure'; kind: 'opened' | 'finished'; count: number }
  | { type: 'structureNone' };

export interface MonthReview {
  monthKey: string;
  monthStart: string;
  monthEnd: string;
  total: number;
  shares: MonthBranchShare[];
  structure: { opened: number; finished: number; dropped: number };
  stall: { count: number; longestDays: number };
  observation: MonthObservation;
}

const MONTH_KEY = /^(\d{4})-(\d{2})$/;

function partsOf(monthKey: string): { year: number; month: number } {
  const match = MONTH_KEY.exec(monthKey);
  if (!match) throw new Error(`月份必须是 YYYY-MM：${monthKey}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) throw new Error(`月份必须是 YYYY-MM：${monthKey}`);
  return { year, month };
}

export function shiftMonthKey(monthKey: string, amount: number): string {
  const { year, month } = partsOf(monthKey);
  const shifted = new Date(Date.UTC(year, month - 1 + amount, 1));
  return shifted.toISOString().slice(0, 7);
}

export function monthBounds(monthKey: string): { monthStart: string; monthEnd: string } {
  const { year, month } = partsOf(monthKey);
  return {
    monthStart: `${monthKey}-01`,
    monthEnd: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10),
  };
}

function shareDelta(
  ratio: number,
  previousRatio: number | null,
): Pick<MonthBranchShare, 'delta' | 'direction'> {
  if (previousRatio === null) return { delta: null, direction: null };
  const delta = ratio - previousRatio;
  if (Math.abs(delta) + 1e-12 < 0.1) return { delta, direction: null };
  return { delta, direction: delta > 0 ? 'up' : 'down' };
}

export function buildMonthReview(input: {
  monthKey: string;
  commits: readonly MonthReviewCommit[];
  branches: readonly MonthReviewBranch[];
  tzOffsetMinutes: number;
}): MonthReview {
  const { monthKey, branches, tzOffsetMinutes } = input;
  const { monthStart, monthEnd } = monthBounds(monthKey);
  const previousMonth = shiftMonthKey(monthKey, -1);
  const resolve = createLevelOneResolver(branches);
  const byId = new Map(branches.map((branch) => [branch.id, branch]));
  const root = branches.find((branch) => branch.parentId === null && branch.deletedAt === null);

  const currentCommits = input.commits.filter(
    (commit) =>
      isYearCommit(commit, Number(monthKey.slice(0, 4))) && commit.date.slice(0, 7) === monthKey,
  );
  const previousCommits = input.commits.filter(
    (commit) =>
      isYearCommit(commit, Number(previousMonth.slice(0, 4))) &&
      commit.date.slice(0, 7) === previousMonth,
  );
  const total = currentCommits.length;
  const previousTotal = previousCommits.length;

  const currentGrouped = new Map<string | null, number>();
  const previousGrouped = new Map<string | null, number>();
  const weeks = new Map<string, Set<string>>();
  for (const commit of currentCommits) {
    const levelOne = resolve(commit.branchId);
    currentGrouped.set(levelOne, (currentGrouped.get(levelOne) ?? 0) + 1);
    if (levelOne !== null) {
      const set = weeks.get(levelOne) ?? new Set<string>();
      set.add(weekStartOf(commit.date));
      weeks.set(levelOne, set);
    }
  }
  for (const commit of previousCommits) {
    const levelOne = resolve(commit.branchId);
    previousGrouped.set(levelOne, (previousGrouped.get(levelOne) ?? 0) + 1);
  }

  const shares: MonthBranchShare[] = [];
  for (const [branchId, commits] of currentGrouped) {
    const branch = branchId === null ? root : byId.get(branchId);
    if (branchId !== null && !branch) continue;
    const ratio = total === 0 ? 0 : commits / total;
    const previousRatio =
      previousTotal === 0 ? null : (previousGrouped.get(branchId) ?? 0) / previousTotal;
    shares.push({
      branchId,
      title: branch?.title ?? '',
      commits,
      ratio,
      ...shareDelta(ratio, previousRatio),
    });
  }
  shares.sort(
    (left, right) =>
      right.commits - left.commits ||
      (byId.get(left.branchId ?? '')?.createdAt ?? root?.createdAt ?? 0) -
        (byId.get(right.branchId ?? '')?.createdAt ?? root?.createdAt ?? 0) ||
      (left.branchId ?? '').localeCompare(right.branchId ?? ''),
  );

  const structure = { opened: 0, finished: 0, dropped: 0 };
  for (const branch of branches) {
    if (branch.deletedAt !== null || branch.depth === 0) continue;
    if (toLocalDate(branch.createdAt, tzOffsetMinutes).slice(0, 7) === monthKey) {
      structure.opened += 1;
    }
    if (
      branch.status === 'merged' &&
      branch.finishedAt !== null &&
      toLocalDate(branch.finishedAt, tzOffsetMinutes).slice(0, 7) === monthKey
    ) {
      structure.finished += 1;
    }
    if (
      branch.droppedAt !== null &&
      toLocalDate(branch.droppedAt, tzOffsetMinutes).slice(0, 7) === monthKey
    ) {
      structure.dropped += 1;
    }
  }

  const commitsThroughMonthEnd = input.commits.filter((commit) => commit.date <= monthEnd);
  const stalls = stallReminders(
    branches,
    commitsThroughMonthEnd,
    { todayDate: monthEnd, tzOffsetMinutes, range: { start: null } },
    branches.length,
  );

  let observation: MonthObservation;
  const top = shares.find((share) => share.branchId !== null) ?? shares[0];
  const continuous = shares.find(
    (share) => share.branchId !== null && (weeks.get(share.branchId)?.size ?? 0) >= 3,
  );
  if (total === 0) {
    observation = { type: 'empty' };
  } else if (top && (top.ratio >= 0.5 || top.ratio <= 0.3)) {
    observation = {
      type: top.ratio >= 0.5 ? 'concentrated' : 'balanced',
      branchId: top.branchId,
      ratio: top.ratio,
    };
  } else if (continuous?.branchId) {
    observation = {
      type: 'continuity',
      branchId: continuous.branchId,
      weeks: weeks.get(continuous.branchId)?.size ?? 0,
    };
  } else if (structure.opened > 0 || structure.finished > 0) {
    const kind = structure.opened >= structure.finished ? 'opened' : 'finished';
    observation = { type: 'structure', kind, count: structure[kind] };
  } else {
    observation = { type: 'structureNone' };
  }

  return {
    monthKey,
    monthStart,
    monthEnd,
    total,
    shares,
    structure,
    stall: { count: stalls.length, longestDays: stalls[0]?.days ?? 0 },
    observation,
  };
}
