import { toLocalDate, toLocalTime } from '@/core/clock';

/**
 * 提交时间格式（R5 / M04 §4.3）。
 *
 * 只出现「年 / 月 / 日 / 时:分」，不出现短 hash 或内部 ID。
 * 时刻按 `at` 的本地时区渲染，不按 `date` 反推。
 */
export function formatCommitTime(at: number, tzOffsetMinutes: number): string {
  const [year, month, day] = toLocalDate(at, tzOffsetMinutes).split('-').map(Number);
  return `${year} 年 ${month} 月 ${day} 日 ${toLocalTime(at, tzOffsetMinutes)}`;
}
