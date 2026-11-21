/**
 * 徽章连续自然月判定（PRD V1-05 §4.1）。
 *
 * 「连续」只按本地自然月 `YYYY-MM` 判断，月份内至少一条有效提交即算；
 * 跨年由 `nextMonth` 处理，闰年不影响月份序列。
 */

export interface MonthCommitRow {
  branchId: string;
  /** 业务日期 `YYYY-MM-DD`。 */
  date: string;
}

export interface MonthStat {
  /** 当月最后一条有效提交的日期。 */
  lastDate: string;
  count: number;
}

export interface MonthRun {
  length: number;
  months: string[];
  lastDate: string;
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function nextMonth(month: string): string {
  const year = Number(month.slice(0, 4));
  const index = Number(month.slice(5, 7));
  return index === 12 ? `${year + 1}-01` : `${year}-${String(index + 1).padStart(2, '0')}`;
}

/** 每个自然月的最后日期与提交数；只统计 `branchIds` 内的分支。 */
export function monthStats(
  commits: readonly MonthCommitRow[],
  branchIds: ReadonlySet<string>,
): Map<string, MonthStat> {
  const stats = new Map<string, MonthStat>();
  for (const commit of commits) {
    if (!branchIds.has(commit.branchId)) continue;
    const key = monthKey(commit.date);
    const previous = stats.get(key);
    if (!previous) {
      stats.set(key, { lastDate: commit.date, count: 1 });
      continue;
    }
    previous.count += 1;
    if (commit.date > previous.lastDate) previous.lastDate = commit.date;
  }
  return stats;
}

/** 最长连续月份段；长度相同保留月份更早的一段。 */
export function longestRun(stats: Map<string, MonthStat>): MonthRun {
  const months = [...stats.keys()].sort();
  let best: MonthRun = { length: 0, months: [], lastDate: '' };
  let run: string[] = [];

  for (const month of months) {
    const previous = run[run.length - 1];
    if (previous && nextMonth(previous) !== month) run = [];
    run.push(month);
    if (run.length > best.length) {
      best = {
        length: run.length,
        months: [...run],
        lastDate: stats.get(month)?.lastDate ?? '',
      };
    }
  }
  return best;
}

/** 连续月份段的逐月提交数，供徽章快照展示。 */
export function monthBreakdown(
  stats: Map<string, MonthStat>,
  months: readonly string[],
): Array<{ month: string; count: number }> {
  return months.map((month) => ({ month, count: stats.get(month)?.count ?? 0 }));
}
