import { isDateString, toLocalDate } from '@/core/clock';
import { t } from '@/i18n';

/**
 * 里程碑日期归一与渲染（R6 / M07 §5）。
 *
 * `day` 保留用户选定当天 00:00 本地时间；`month` 归一为当月 1 日 00:00 本地时间，
 * 不补虚构的日；`year` 仅为旧数据保留渲染，MVP 新建不提供。
 */
export type MilestonePrecision = 'day' | 'month' | 'year';

/** 把 `YYYY-MM-DD` 归一为 UTC 毫秒；`month` 取当月 1 日。 */
export function normalizeMilestoneAchievedAt(
  date: string,
  precision: MilestonePrecision,
  tzOffsetMinutes: number,
): number {
  if (!isCalendarDate(date)) {
    throw new Error(`里程碑日期必须是真实日历日：${date}`);
  }
  const [year, month, day] = date.split('-').map(Number);
  const targetMonth = precision === 'year' ? 1 : month!;
  const targetDay = precision === 'day' ? day! : 1;
  return Date.UTC(year!, targetMonth - 1, targetDay) - tzOffsetMinutes * 60_000;
}

function isCalendarDate(value: string): boolean {
  if (!isDateString(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day
  );
}

export function formatMilestoneDate(
  achievedAt: number,
  precision: MilestonePrecision,
  tzOffsetMinutes: number,
): string {
  const [year, month, day] = toLocalDate(achievedAt, tzOffsetMinutes).split('-').map(Number);
  const yearText = `${year}${t('milestone.date.yearSuffix')}`;
  if (precision === 'year') return yearText;
  const monthText = `${yearText} ${month}${t('milestone.date.monthSuffix')}`;
  if (precision === 'month') return monthText;
  return `${month}${t('milestone.date.monthSuffix')} ${day}${t('milestone.date.daySuffix')}`;
}

/** 表单回填：`month` 精度返回 `YYYY-MM`，其余返回 `YYYY-MM-DD`。 */
export function milestoneDateInputValue(
  achievedAt: number,
  precision: MilestonePrecision,
  tzOffsetMinutes: number,
): string {
  const date = toLocalDate(achievedAt, tzOffsetMinutes);
  return precision === 'month' ? date.slice(0, 7) : date;
}
