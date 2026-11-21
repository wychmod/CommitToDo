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
