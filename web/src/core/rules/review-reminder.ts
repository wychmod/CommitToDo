/** 周日应用内回顾提醒（G-02）。纯判定，不读写 localStorage。 */

import { toLocalDate } from '@/core/clock';
import { weekDayOf } from './week-review';

export const REVIEW_REMINDER_STORAGE_KEY = 'reminder.lastShownDate';

export interface ReviewReminderDecision {
  date: string;
  show: boolean;
}

export function assessReviewReminder(input: {
  now: number;
  tzOffsetMinutes: number;
  enabled: boolean;
  lastShownDate: string | null;
}): ReviewReminderDecision {
  const date = toLocalDate(input.now, input.tzOffsetMinutes);
  const localHour = new Date(input.now + input.tzOffsetMinutes * 60_000).getUTCHours();
  const show =
    input.enabled && weekDayOf(date) === 7 && localHour >= 20 && input.lastShownDate !== date;
  return { date, show };
}
