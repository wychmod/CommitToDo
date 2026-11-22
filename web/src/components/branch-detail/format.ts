import { currentTzOffset, toLocalDate, toLocalTime } from '@/core/clock';
import { t } from '@/i18n';

/**
 * 分支详情内的日期时间统一为「短日期 + 时刻」一档（P03-5）。
 *
 * 同页只保留短日期与日期时间两种格式，不再出现带年份的长格式。
 */
export function formatShortDateTime(at: number): string {
  const [, month, day] = toLocalDate(at, currentTzOffset(at)).split('-').map(Number);
  return `${month}${t('milestone.date.monthSuffix')} ${day}${t(
    'milestone.date.daySuffix',
  )} ${toLocalTime(at, currentTzOffset(at))}`;
}
