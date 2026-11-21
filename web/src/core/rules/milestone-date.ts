import { toLocalDate } from '@/core/clock';

/**
 * 里程碑日期渲染（R6 / M04 §4.5）。
 *
 * `day` 显示到日，`month` 只到月，`year` 只到年；不补虚构的日。
 * 具体断言在 M07 的 `milestone-date.test.ts` 覆盖，本页只复用渲染结果。
 */
export type MilestonePrecision = 'day' | 'month' | 'year';

export function formatMilestoneDate(
  achievedAt: number,
  precision: MilestonePrecision,
  tzOffsetMinutes: number,
): string {
  const [year, month, day] = toLocalDate(achievedAt, tzOffsetMinutes).split('-').map(Number);
  if (precision === 'year') return `${year} 年`;
  if (precision === 'month') return `${year} 年 ${month} 月`;
  return `${month} 月 ${day} 日`;
}
