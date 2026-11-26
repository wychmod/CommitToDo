/**
 * 月历纯函数。不读系统时钟；「今天」由调用方传入。
 */

import { addDays, isDateString } from './clock';

export interface CalendarCell {
  date: string;
  inMonth: boolean;
}

export type Shortcut = 'today' | 'tomorrow' | 'nextFriday';

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

const pad2 = (value: number): string => value.toString().padStart(2, '0');

function assertDate(date: string): void {
  if (!isDateString(date)) {
    throw new Error(`日期必须是 YYYY-MM-DD：${date}`);
  }
}

function parseMonth(month: string): { year: number; month: number } {
  const match = MONTH_PATTERN.exec(month);
  const monthNumber = match ? Number(match[2]) : 0;
  if (!match || monthNumber < 1 || monthNumber > 12) {
    throw new Error(`月份必须是 YYYY-MM：${month}`);
  }
  return { year: Number(match[1]), month: monthNumber };
}

/** 周一为 0，周日为 6。 */
export function weekdayIndex(date: string): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  assertDate(date);
  const match = DATE_PATTERN.exec(date);
  if (!match) {
    throw new Error(`日期必须是 YYYY-MM-DD：${date}`);
  }
  const utc = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return ((utc.getUTCDay() + 6) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

/** 所在周的下一周周五。周从周一开始。 */
export function nextWeekFriday(date: string): string {
  const daysAfterThisFriday = weekdayIndex(date) - 4;
  return addDays(date, 7 - daysAfterThisFriday);
}

export function monthOf(date: string): string {
  assertDate(date);
  return date.slice(0, 7);
}

export function addMonths(month: string, delta: number): string {
  const { year, month: monthNumber } = parseMonth(month);
  const total = year * 12 + (monthNumber - 1) + delta;
  const normalized = ((total % 12) + 12) % 12;
  const nextYear = Math.floor(total / 12);
  return `${nextYear}-${pad2(normalized + 1)}`;
}

export function isSelectable(date: string, min?: string): boolean {
  assertDate(date);
  if (min === undefined) return true;
  assertDate(min);
  return date >= min;
}

const DAY_STEP = { left: -1, right: 1, up: -7, down: 7 } as const;

export function moveDay(date: string, direction: keyof typeof DAY_STEP): string {
  assertDate(date);
  return addDays(date, DAY_STEP[direction]);
}

/** 周一开头，含上月与下月的补位日，不补满六行。 */
export function monthGrid(month: string): CalendarCell[] {
  const { year, month: monthNumber } = parseMonth(month);
  const first = `${year}-${pad2(monthNumber)}-01`;
  const lead = weekdayIndex(first);
  const start = addDays(first, -lead);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const count = Math.ceil((lead + daysInMonth) / 7) * 7;
  return Array.from({ length: count }, (_, index) => {
    const date = addDays(start, index);
    return { date, inMonth: monthOf(date) === month };
  });
}

export function shortcutDate(kind: Shortcut, anchor: string): string {
  assertDate(anchor);
  if (kind === 'today') return anchor;
  if (kind === 'tomorrow') return addDays(anchor, 1);
  return nextWeekFriday(anchor);
}
