'use strict';

/** 只读页面共用的日期与时间格式，口径与 Web 主端一致。 */

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function pad(value) {
  return String(value).padStart(2, '0');
}

function parseDate(value) {
  const [year, month, day] = String(value || '').split('-').map(Number);
  return { year, month, day };
}

/** `2026-11-20` → `11 月 20 日 · 周五`。 */
function dateLabel(value) {
  const { year, month, day } = parseDate(value);
  if (!year || !month || !day) return '';
  const weekday = WEEKDAYS[new Date(year, month - 1, day).getDay()];
  return `${month} 月 ${day} 日 · ${weekday}`;
}

/** `2026-11-20` → `11.20`。 */
function monthDay(value) {
  const { month, day } = parseDate(value);
  if (!month || !day) return '';
  return `${pad(month)}.${pad(day)}`;
}

function timeLabel(epochMs) {
  if (!epochMs) return '';
  const date = new Date(Number(epochMs));
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** PRD 要求的「更新于 HH:mm」；缓存回退时用缓存写入时刻。 */
function updatedLabel(epochMs) {
  const time = timeLabel(epochMs);
  return time ? `更新于 ${time}` : '';
}

function syncLabel(epochMs) {
  const time = timeLabel(epochMs);
  return time ? `最近同步 ${time}` : '还没有同步记录';
}

module.exports = { dateLabel, monthDay, timeLabel, updatedLabel, syncLabel };
