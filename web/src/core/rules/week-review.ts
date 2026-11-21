/**
 * 周回顾统计（TECH §5.3.3 R9 / PRD M09）。
 *
 * 全部现算、不落库：只在当地时间周六/周日、且本周至少一条有效提交时出现；
 * 统计本周有效提交、活跃分支与连续提交周数。周一 00:00 起自然消失，不补看往周。
 */

export interface WeekReviewCommit {
  id: string;
  branchId: string;
  /** 业务日期，`YYYY-MM-DD`（本地自然日）。 */
  date: string;
  at: number;
  voidedAt: number | null;
}

export interface WeekReviewBranch {
  id: string;
  status: 'active' | 'merged' | 'dropped';
  deletedAt?: number | null;
}

export interface WeekReviewStats {
  /** 是否渲染整张卡片：周末且本周有效提交 > 0。 */
  visible: boolean;
  weekStart: string;
  weekEnd: string;
  commitCount: number;
  /** 本周有至少一条有效提交的分支数，按 `branchId` 去重；已放下不计。 */
  activeBranchCount: number;
  /** 截至本周连续有有效提交的周数；本周无提交时为 0。 */
  streakWeeks: number;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function toEpoch(date: string): number {
  const match = DATE_PATTERN.exec(date);
  if (!match) throw new Error(`日期必须是 YYYY-MM-DD：${date}`);
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function fromEpoch(epoch: number): string {
  return new Date(epoch).toISOString().slice(0, 10);
}

/** 周一 = 1 … 周日 = 7。 */
export function weekDayOf(date: string): number {
  const day = new Date(toEpoch(date)).getUTCDay();
  return ((day + 6) % 7) + 1;
}

/** 所在周的周一。 */
export function weekStartOf(date: string): string {
  return fromEpoch(toEpoch(date) - (weekDayOf(date) - 1) * 86_400_000);
}

/** 仅在周六、周日出现。 */
export function isWeekReviewDay(date: string): boolean {
  return weekDayOf(date) >= 6;
}

/** 本周（周一至今天）的有效提交；撤销与未来日期都不计。 */
export function collectWeekCommits(
  commits: readonly WeekReviewCommit[],
  todayDate: string,
): WeekReviewCommit[] {
  const weekStart = weekStartOf(todayDate);
  return commits.filter(
    (commit) => commit.voidedAt === null && commit.date >= weekStart && commit.date <= todayDate,
  );
}

function hasWeekCommits(commits: readonly WeekReviewCommit[], weekStart: string): boolean {
  const weekEnd = fromEpoch(toEpoch(weekStart) + 6 * 86_400_000);
  return commits.some(
    (commit) => commit.voidedAt === null && commit.date >= weekStart && commit.date <= weekEnd,
  );
}

export function assessWeekReview(input: {
  todayDate: string;
  commits: readonly WeekReviewCommit[];
  branches: readonly WeekReviewBranch[];
}): WeekReviewStats {
  const weekStart = weekStartOf(input.todayDate);
  const weekEnd = fromEpoch(toEpoch(weekStart) + 6 * 86_400_000);

  if (!isWeekReviewDay(input.todayDate)) {
    return {
      visible: false,
      weekStart,
      weekEnd,
      commitCount: 0,
      activeBranchCount: 0,
      streakWeeks: 0,
    };
  }

  const weekCommits = collectWeekCommits(input.commits, input.todayDate);
  if (weekCommits.length === 0) {
    return {
      visible: false,
      weekStart,
      weekEnd,
      commitCount: 0,
      activeBranchCount: 0,
      streakWeeks: 0,
    };
  }

  const branchById = new Map(input.branches.map((branch) => [branch.id, branch]));
  const activeIds = new Set<string>();
  for (const commit of weekCommits) {
    const branch = branchById.get(commit.branchId);
    // 已放下分支的提交计入提交数，但不计入活跃分支；已归档与已合并照常计入。
    if (branch?.status === 'dropped') continue;
    activeIds.add(commit.branchId);
  }

  let streakWeeks = 0;
  let cursor = weekStart;
  while (hasWeekCommits(input.commits, cursor)) {
    streakWeeks += 1;
    cursor = fromEpoch(toEpoch(cursor) - 7 * 86_400_000);
  }

  return {
    visible: true,
    weekStart,
    weekEnd,
    commitCount: weekCommits.length,
    activeBranchCount: activeIds.size,
    streakWeeks,
  };
}
