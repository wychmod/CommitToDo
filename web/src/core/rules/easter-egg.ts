/**
 * 五枚彩蛋徽章的判定（PRD V2-03 §4.2 / OP-04 / OP-05）。
 *
 * 只算 `voidedAt == null` 且未删除的有效提交；夜航按完成时刻的本地时间，
 * 空白年与满月按业务日期 `date` 的本地自然年 / 自然月，且只对已结束周期判定。
 * 同一枚只返回一次，重复授予由 `selectNewBadges` 再兜一层。
 */

import { addDays, toLocalDate, toLocalTime } from '@/core/clock';
import type { BadgeBranchRow, BadgeCandidate, BadgeCommitRow } from './badges';
import { daysBetween } from './time-range';

export interface EasterEggRows {
  branches: readonly BadgeBranchRow[];
  commits: readonly BadgeCommitRow[];
}

export interface EasterEggAssessment {
  candidates: BadgeCandidate[];
}

const NIGHT_START_HOUR = 23;
const NIGHT_END_HOUR = 5;
const NIGHT_DAYS = 3;
const REVIVAL_DAYS = 90;

function validCommits(commits: readonly BadgeCommitRow[]): BadgeCommitRow[] {
  return commits
    .filter((commit) => commit.voidedAt === null && commit.deletedAt === null)
    .sort((left, right) => left.at - right.at || left.id.localeCompare(right.id));
}

function isNightCommit(commit: BadgeCommitRow, tzOffsetMinutes: number): boolean {
  const hour = Number(toLocalTime(commit.at, tzOffsetMinutes).slice(0, 2));
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
}

/** 夜航：连续 3 个自然日每天至少一条 23:00–5:00 的有效提交。 */
function nightFlight(
  commits: readonly BadgeCommitRow[],
  tzOffsetMinutes: number,
): BadgeCandidate | null {
  const byDate = new Map<string, BadgeCommitRow[]>();
  for (const commit of commits) {
    if (!isNightCommit(commit, tzOffsetMinutes)) continue;
    const date = toLocalDate(commit.at, tzOffsetMinutes);
    const rows = byDate.get(date) ?? [];
    rows.push(commit);
    byDate.set(date, rows);
  }

  const dates = [...byDate.keys()].sort();
  for (let index = 0; index <= dates.length - NIGHT_DAYS; index += 1) {
    const start = dates[index]!;
    const second = addDays(start, 1);
    const third = addDays(start, 2);
    if (!byDate.has(second) || !byDate.has(third)) continue;

    const last = byDate.get(third)![0]!;
    return {
      catalogId: 'night-flight',
      category: 'easter',
      sourceEntityId: last.id,
      snapshot: {
        commitId: last.id,
        branchId: last.branchId,
        dates: [start, second, third],
        eventDate: third,
      },
    };
  }
  return null;
}

/** 跨年：12 月 31 日或 1 月 1 日有有效提交。 */
function crossYear(commits: readonly BadgeCommitRow[]): BadgeCandidate | null {
  const hit = commits.find(
    (commit) => commit.date.endsWith('-12-31') || commit.date.endsWith('-01-01'),
  );
  if (!hit) return null;
  return {
    catalogId: 'cross-year',
    category: 'easter',
    sourceEntityId: hit.id,
    snapshot: {
      commitId: hit.id,
      branchId: hit.branchId,
      eventDate: hit.date,
    },
  };
}

/**
 * 复活：已放下分支重新开始后，距本分支上一条有效提交 ≥90 天又有有效提交。
 * 根分支与从未放下的分支不参与，首次提交不触发。
 */
function revival(
  branches: readonly BadgeBranchRow[],
  commits: readonly BadgeCommitRow[],
): BadgeCandidate | null {
  let best: { branch: BadgeBranchRow; commit: BadgeCommitRow; previous: BadgeCommitRow } | null =
    null;

  for (const branch of branches) {
    if (branch.deletedAt !== null) continue;
    if (branch.parentId === null) continue;
    if (branch.droppedAt === null || branch.status !== 'active') continue;

    const own = commits.filter((commit) => commit.branchId === branch.id);
    for (let index = 1; index < own.length; index += 1) {
      const previous = own[index - 1]!;
      const current = own[index]!;
      if (current.at < branch.droppedAt) continue;
      if (daysBetween(previous.date, current.date) < REVIVAL_DAYS) continue;
      if (!best || current.at < best.commit.at) best = { branch, commit: current, previous };
      break;
    }
  }

  if (!best) return null;
  return {
    catalogId: 'revival',
    category: 'easter',
    sourceEntityId: best.commit.id,
    snapshot: {
      branchId: best.branch.id,
      title: best.branch.title,
      commitId: best.commit.id,
      previousDate: best.previous.date,
      eventDate: best.commit.date,
    },
  };
}

/** 空白年：已结束自然年恰好只有 1 条有效提交；当年不判定。 */
function blankYear(commits: readonly BadgeCommitRow[], todayDate: string): BadgeCandidate | null {
  const currentYear = Number(todayDate.slice(0, 4));
  const byYear = new Map<number, BadgeCommitRow[]>();
  for (const commit of commits) {
    const year = Number(commit.date.slice(0, 4));
    if (!Number.isFinite(year) || year >= currentYear) continue;
    const rows = byYear.get(year) ?? [];
    rows.push(commit);
    byYear.set(year, rows);
  }

  const years = [...byYear.keys()].filter((year) => byYear.get(year)!.length === 1).sort();
  const year = years[years.length - 1];
  if (year === undefined) return null;
  const commit = byYear.get(year)![0]!;
  return {
    catalogId: 'blank-year',
    category: 'easter',
    sourceEntityId: commit.id,
    snapshot: {
      year,
      commitId: commit.id,
      branchId: commit.branchId,
      eventDate: `${year}-12-31`,
    },
  };
}

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 满月：已结束自然月每天都有至少一条有效提交；当月不判定。 */
function fullMoon(commits: readonly BadgeCommitRow[], todayDate: string): BadgeCandidate | null {
  const currentMonth = todayDate.slice(0, 7);
  const byMonth = new Map<string, BadgeCommitRow[]>();
  for (const commit of commits) {
    const month = commit.date.slice(0, 7);
    if (!MONTH_PATTERN.test(month) || month >= currentMonth) continue;
    const rows = byMonth.get(month) ?? [];
    rows.push(commit);
    byMonth.set(month, rows);
  }

  const months = [...byMonth.keys()].sort();
  let hit: { month: string; rows: BadgeCommitRow[]; days: number } | null = null;
  for (const month of months) {
    const match = MONTH_PATTERN.exec(month)!;
    const total = daysInMonth(Number(match[1]), Number(match[2]));
    const rows = byMonth.get(month)!;
    const covered = new Set(rows.map((commit) => commit.date));
    if (covered.size !== total) continue;
    hit = { month, rows, days: total };
  }

  if (!hit) return null;
  const first = hit.rows[0]!;
  return {
    catalogId: 'full-moon',
    category: 'easter',
    sourceEntityId: first.id,
    snapshot: {
      month: hit.month,
      days: hit.days,
      commitId: first.id,
      branchId: first.branchId,
      eventDate: `${hit.month}-${String(hit.days).padStart(2, '0')}`,
    },
  };
}

export function assessEasterEggs(
  rows: EasterEggRows,
  nowMs: number,
  tzOffsetMinutes: number,
): EasterEggAssessment {
  const commits = validCommits(rows.commits);
  const todayDate = toLocalDate(nowMs, tzOffsetMinutes);
  const candidates = [
    nightFlight(commits, tzOffsetMinutes),
    crossYear(commits),
    revival(rows.branches, commits),
    blankYear(commits, todayDate),
    fullMoon(commits, todayDate),
  ].filter((candidate): candidate is BadgeCandidate => candidate !== null);

  return { candidates };
}
