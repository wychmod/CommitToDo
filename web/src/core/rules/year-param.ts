/**
 * 年轮年份参数与可选范围（PRD V1-02 §4.1 / OP-01）。
 *
 * URL 里的年份只接受四位数字，且不早于本机最早记录、不晚于当前年；
 * 非法或越界一律回落到当前年，页面据此用 `replace` 改写 URL。
 */

import { toLocalDate } from '@/core/clock';

export interface YearBounds {
  earliestYear: number;
  currentYear: number;
}

export interface YearParamResolution {
  year: number;
  normalized: string;
  corrected: boolean;
}

const FOUR_DIGITS = /^\d{4}$/;

export function resolveYearParam(raw: string | undefined, bounds: YearBounds): YearParamResolution {
  const current = bounds.currentYear;
  const earliest = Math.min(bounds.earliestYear, current);
  if (raw === undefined || !FOUR_DIGITS.test(raw)) {
    return { year: current, normalized: String(current), corrected: true };
  }
  const value = Number(raw);
  if (value < earliest || value > current) {
    return { year: current, normalized: String(current), corrected: true };
  }
  return { year: value, normalized: raw, corrected: false };
}

/** 年份条：从当前年往前到最早记录年（含两端）。 */
export function listSelectableYears(bounds: YearBounds): number[] {
  const current = bounds.currentYear;
  const earliest = Math.min(bounds.earliestYear, current);
  const years: number[] = [];
  for (let year = current; year >= earliest; year -= 1) years.push(year);
  return years;
}

export interface YearBoundsInput {
  commits: ReadonlyArray<{
    date: string;
    voidedAt: number | null;
    deletedAt?: number | null;
  }>;
  branches: ReadonlyArray<{
    createdAt: number;
    deletedAt?: number | null;
  }>;
  todayDate: string;
  tzOffsetMinutes: number;
}

/**
 * 最早记录年取有效提交日期与分支创建日期（本地年）的较小值；
 * 没有任何记录时范围只有当前年。
 */
export function yearBoundsFor(input: YearBoundsInput): YearBounds {
  const currentYear = Number(input.todayDate.slice(0, 4));
  let earliest = currentYear;

  for (const commit of input.commits) {
    if (commit.voidedAt !== null) continue;
    if ((commit.deletedAt ?? null) !== null) continue;
    const year = Number(commit.date.slice(0, 4));
    if (Number.isFinite(year) && year < earliest) earliest = year;
  }
  for (const branch of input.branches) {
    const year = Number(toLocalDate(branch.createdAt, input.tzOffsetMinutes).slice(0, 4));
    if (Number.isFinite(year) && year < earliest) earliest = year;
  }

  return {
    earliestYear: Math.min(earliest, currentYear),
    currentYear,
  };
}
