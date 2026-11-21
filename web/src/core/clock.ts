/**
 * 时间入口（docs/CODE-STRUCTURE.md §2）。
 *
 * 领域代码不直接调 `Date.now()` / `new Date()`：用例通过 `WriteDeps.clock` 注入，
 * 测试传固定时钟即可断言「当天」与 M05 的跨日边界，不依赖运行机器时区。
 */

export interface Clock {
  /** 当前时刻，UTC 毫秒。 */
  now(): number;
}

export const systemClock: Clock = {
  now: () => Date.now(),
};

const pad2 = (value: number): string => value.toString().padStart(2, '0');

/** 把 UTC 毫秒按给定时区偏移换成 `YYYY-MM-DD`（东正西负，UTC+8 传 480）。 */
export function toLocalDate(epochMs: number, tzOffsetMinutes: number): string {
  const shifted = new Date(epochMs + tzOffsetMinutes * 60_000);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** 当前时区偏移（东正西负，分钟）。 */
export function currentTzOffset(epochMs: number): number {
  return -new Date(epochMs).getTimezoneOffset();
}

/** 当天日期；偏移缺省取运行环境当前时区。R8 三组与 V1-06 快照日键都用它。 */
export function today(clock: Clock, tzOffsetMinutes?: number): string {
  const now = clock.now();
  return toLocalDate(now, tzOffsetMinutes ?? currentTzOffset(now));
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 是否为 `YYYY-MM-DD` 形状的日期串（不校验具体月份天数）。 */
export function isDateString(value: string): boolean {
  return DATE_PATTERN.test(value);
}

/** 在 `YYYY-MM-DD` 上加减自然日，跨月与闰年由 UTC 日期运算保证。 */
export function addDays(date: string, days: number): string {
  const match = DATE_PATTERN.exec(date);
  if (!match) {
    throw new Error(`日期必须是 YYYY-MM-DD：${date}`);
  }
  const base = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Date(base + days * 86_400_000).toISOString().slice(0, 10);
}

/** 把 UTC 毫秒按给定时区偏移换成 `HH:mm`，用于完成回执与提交行。 */
export function toLocalTime(epochMs: number, tzOffsetMinutes: number): string {
  const shifted = new Date(epochMs + tzOffsetMinutes * 60_000);
  return `${pad2(shifted.getUTCHours())}:${pad2(shifted.getUTCMinutes())}`;
}

/** 当前本地时区下的 `HH:mm`。 */
export function localClockTime(epochMs: number): string {
  return toLocalTime(epochMs, currentTzOffset(epochMs));
}

/** 当前本地时区下的 `YYYY-MM-DD`。 */
export function localDate(epochMs: number): string {
  return toLocalDate(epochMs, currentTzOffset(epochMs));
}
