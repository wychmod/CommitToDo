/**
 * 时间类 4 枚徽章的条件判定（PRD V1-05 §4.1 / OP-03）。
 *
 * 起笔、补白、常青、第一年。有效提交只认 `voidedAt == null`；
 * 「常青」只计本分支自己的提交，不含后代。
 */

import { addDays, toLocalDate } from '@/core/clock';
import type {
  BadgeBranchRow,
  BadgeCandidate,
  BadgeCommitRow,
  BadgeMilestoneRow,
  BadgeProgress,
} from './badges';
import { longestRun, monthBreakdown, monthStats } from './badge-months';
import { daysBetween } from './time-range';
import { milestoneAnchor } from './timeline-placement';

export interface TimeAssessment {
  candidates: BadgeCandidate[];
  progress: BadgeProgress[];
}

interface Rows {
  branches: readonly BadgeBranchRow[];
  commits: readonly BadgeCommitRow[];
  milestones: readonly BadgeMilestoneRow[];
}

const YEAR_DAYS = 365;

function validCommits(commits: readonly BadgeCommitRow[]): BadgeCommitRow[] {
  return commits.filter((commit) => commit.voidedAt === null && commit.deletedAt === null);
}

function earliest<T>(rows: readonly T[], at: (row: T) => number, id: (row: T) => string): T | null {
  let best: T | null = null;
  for (const row of rows) {
    if (best === null) {
      best = row;
      continue;
    }
    const delta = at(row) - at(best);
    if (delta < 0 || (delta === 0 && id(row) < id(best))) best = row;
  }
  return best;
}

export function assessTimeBadges(
  rows: Rows,
  nowMs: number,
  tzOffsetMinutes: number,
): TimeAssessment {
  const candidates: BadgeCandidate[] = [];
  const progress: BadgeProgress[] = [];
  const commits = validCommits(rows.commits);
  const milestones = rows.milestones.filter((row) => row.deletedAt === null);
  const dateOf = (ms: number): string => toLocalDate(ms, tzOffsetMinutes);

  // 起笔：第一条有效提交。
  const firstCommit = earliest(
    commits,
    (commit) => commit.at,
    (commit) => commit.id,
  );
  progress.push({ catalogId: 'first-commit', current: firstCommit ? 1 : 0, target: 1 });
  if (firstCommit) {
    candidates.push({
      catalogId: 'first-commit',
      category: 'time',
      sourceEntityId: firstCommit.id,
      snapshot: {
        commitId: firstCommit.id,
        branchId: firstCommit.branchId,
        summary: firstCommit.summary,
        at: firstCommit.at,
        eventDate: firstCommit.date,
      },
    });
  }

  // 补白：创建日期在过去的里程碑。
  const backfilled = milestones
    .map((milestone) => ({
      milestone,
      eventDate: milestoneAnchor(milestone.achievedAt, milestone.datePrecision, tzOffsetMinutes),
      createdDate: dateOf(milestone.createdAt),
    }))
    .filter((row) => row.eventDate < row.createdDate)
    .sort(
      (left, right) =>
        left.milestone.createdAt - right.milestone.createdAt ||
        left.milestone.id.localeCompare(right.milestone.id),
    );
  progress.push({ catalogId: 'backfill', current: backfilled.length, target: 1 });
  const firstBackfill = backfilled[0];
  if (firstBackfill) {
    candidates.push({
      catalogId: 'backfill',
      category: 'time',
      sourceEntityId: firstBackfill.milestone.id,
      snapshot: {
        milestoneId: firstBackfill.milestone.id,
        title: firstBackfill.milestone.title,
        branchId: firstBackfill.milestone.branchId,
        backfillDate: firstBackfill.createdDate,
        eventDate: firstBackfill.eventDate,
      },
    });
  }

  // 常青：单条分支连续 6 个自然月有有效提交，只计本分支。
  let evergreen: {
    branch: BadgeBranchRow;
    run: ReturnType<typeof longestRun>;
    stats: ReturnType<typeof monthStats>;
  } | null = null;
  let evergreenMax = 0;
  for (const branch of rows.branches) {
    if (branch.deletedAt !== null) continue;
    const stats = monthStats(commits, new Set([branch.id]));
    const run = longestRun(stats);
    evergreenMax = Math.max(evergreenMax, run.length);
    if (run.length < 6) continue;
    if (!evergreen || run.lastDate < evergreen.run.lastDate) evergreen = { branch, run, stats };
  }
  progress.push({ catalogId: 'evergreen', current: evergreenMax, target: 6 });
  if (evergreen) {
    candidates.push({
      catalogId: 'evergreen',
      category: 'time',
      sourceEntityId: evergreen.branch.id,
      snapshot: {
        branchId: evergreen.branch.id,
        title: evergreen.branch.title,
        fromMonth: evergreen.run.months[0]!,
        toMonth: evergreen.run.months[evergreen.run.months.length - 1]!,
        months: monthBreakdown(evergreen.stats, evergreen.run.months),
        eventDate: evergreen.run.lastDate,
      },
    });
  }

  // 第一年：根分支创建满 365 天。
  const root = earliest(
    rows.branches.filter((branch) => branch.deletedAt === null && branch.parentId === null),
    (branch) => branch.createdAt,
    (branch) => branch.id,
  );
  const todayDate = dateOf(nowMs);
  if (!root) {
    progress.push({ catalogId: 'first-year', current: 0, target: YEAR_DAYS });
  } else {
    const startDate = dateOf(root.createdAt);
    const day365 = addDays(startDate, YEAR_DAYS);
    const elapsed = Math.min(YEAR_DAYS, Math.max(0, daysBetween(startDate, todayDate)));
    progress.push({ catalogId: 'first-year', current: elapsed, target: YEAR_DAYS });
    if (todayDate >= day365) {
      candidates.push({
        catalogId: 'first-year',
        category: 'time',
        sourceEntityId: root.id,
        snapshot: {
          branchId: root.id,
          title: root.title,
          startDate,
          day365,
          eventDate: day365,
        },
      });
    }
  }

  return { candidates, progress };
}
