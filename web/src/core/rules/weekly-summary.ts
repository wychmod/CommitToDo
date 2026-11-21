/**
 * 本周摘要（R3 / R4，PRD V1-03 §4.1）。
 *
 * 周一至今天只按业务日期现算有效提交；停滞复用 R4，完整计数与最多三个名称分开返回。
 */

import { collectWeekCommits, weekStartOf } from './week-review';
import { stallReminders, type StallBranch, type StallCommit } from './stagnation';

export interface WeeklySummaryCommit extends StallCommit {
  id: string;
}

export interface WeeklySummaryBranch extends StallBranch {
  title: string;
  deletedAt?: number | null;
}

export interface WeeklySummaryStall {
  branchId: string;
  title: string;
  days: number;
}

export interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  commitCount: number;
  stallCount: number;
  /** 按停滞天数降序，最多三条。 */
  stalledBranches: WeeklySummaryStall[];
}

export function computeWeeklySummary(input: {
  todayDate: string;
  commits: readonly WeeklySummaryCommit[];
  branches: readonly WeeklySummaryBranch[];
  tzOffsetMinutes: number;
}): WeeklySummary {
  const commits = input.commits.filter((commit) => (commit.deletedAt ?? null) === null);
  const branches = input.branches.filter((branch) => (branch.deletedAt ?? null) === null);
  const weekCommits = collectWeekCommits(commits, input.todayDate);
  const reminders = stallReminders(
    branches,
    commits,
    {
      todayDate: input.todayDate,
      tzOffsetMinutes: input.tzOffsetMinutes,
      range: { start: null },
    },
    branches.length,
  );
  const titleById = new Map(branches.map((branch) => [branch.id, branch.title]));

  return {
    weekStart: weekStartOf(input.todayDate),
    weekEnd: input.todayDate,
    commitCount: weekCommits.length,
    stallCount: reminders.length,
    stalledBranches: reminders.slice(0, 3).map((reminder) => ({
      branchId: reminder.branchId,
      title: titleById.get(reminder.branchId) ?? reminder.branchId,
      days: reminder.days,
    })),
  };
}
