import { currentTzOffset, toLocalDate, toLocalTime } from '@/core/clock';
import { t } from '@/i18n';

/**
 * 分支详情内的日期时间统一为「短日期 + 时刻」一档（P03-5）。
 *
 * 同一屏只保留短日期与日期时间两种格式；仅「创建于」按画稿带年份。
 */
export function formatShortDateTime(at: number): string {
  const [, month, day] = toLocalDate(at, currentTzOffset(at)).split('-').map(Number);
  return `${month}${t('milestone.date.monthSuffix')} ${day}${t(
    'milestone.date.daySuffix',
  )} ${toLocalTime(at, currentTzOffset(at))}`;
}

/** 带年份的长日期，用于分支创建日（画稿 `2026 年 11 月 13 日`）。 */
export function formatLongDate(at: number): string {
  const [year, month, day] = toLocalDate(at, currentTzOffset(at)).split('-').map(Number);
  return `${year}${t('milestone.date.yearSuffix')} ${month}${t(
    'milestone.date.monthSuffix',
  )} ${day}${t('milestone.date.daySuffix')}`;
}
