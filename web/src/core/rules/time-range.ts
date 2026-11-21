/**
 * 历程时间范围（M06 §5 / OP-04）。
 *
 * 全部以本地自然日计算：「近 90 天」含今天往前共 90 个自然日；
 * 「今年」取 1 月 1 日与近 90 天起点中更早者；「全部」无下界。
 */

import { addDays, isDateString } from '@/core/clock';

export const RECENT_RANGE_DAYS = 90;

export type TimeRangeKind = 'recent90' | 'thisYear' | 'all';

export const TIME_RANGE_KINDS: readonly TimeRangeKind[] = ['recent90', 'thisYear', 'all'];

export interface TimeRange {
  kind: TimeRangeKind;
  /** `null` 表示无下界（全部）。 */
  start: string | null;
  end: string;
}

export function isTimeRangeKind(value: unknown): value is TimeRangeKind {
  return typeof value === 'string' && (TIME_RANGE_KINDS as readonly string[]).includes(value);
}

function assertDate(value: string): void {
  if (!isDateString(value)) {
    throw new Error(`日期必须是 YYYY-MM-DD：${value}`);
  }
}

/** 按今天与档位算出起止日；「今年」的起点可能落在上一年。 */
export function resolveTimeRange(kind: TimeRangeKind, todayDate: string): TimeRange {
  assertDate(todayDate);
  if (kind === 'all') return { kind, start: null, end: todayDate };

  const recentStart = addDays(todayDate, -(RECENT_RANGE_DAYS - 1));
  if (kind === 'recent90') return { kind, start: recentStart, end: todayDate };

  const yearStart = `${todayDate.slice(0, 4)}-01-01`;
  return { kind, start: recentStart < yearStart ? recentStart : yearStart, end: todayDate };
}

/** 日期是否落在范围内（含两端）。 */
export function inTimeRange(range: TimeRange, date: string): boolean {
  if (date > range.end) return false;
  return range.start === null || date >= range.start;
}

/** 两个 `YYYY-MM-DD` 之间相差的自然日，`to` 更晚为正。 */
export function daysBetween(from: string, to: string): number {
  assertDate(from);
  assertDate(to);
  const parse = (value: string): number => {
    const [year, month, day] = value.split('-').map(Number);
    return Date.UTC(year!, month! - 1, day!);
  };
  return Math.round((parse(to) - parse(from)) / 86_400_000);
}
