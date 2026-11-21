import { describe, expect, it } from 'vitest';
import { toLocalDate } from '@/core/clock';
import {
  formatMilestoneDate,
  milestoneDateInputValue,
  normalizeMilestoneAchievedAt,
} from './milestone-date';

const TZ = 480;

describe('里程碑日期归一（R6 / M07 §5）', () => {
  it('day 精度保留用户选定的当天 00:00 本地时间', () => {
    const achievedAt = normalizeMilestoneAchievedAt('2026-11-20', 'day', TZ);
    expect(achievedAt).toBe(Date.UTC(2026, 10, 20) - TZ * 60_000);
    expect(toLocalDate(achievedAt, TZ)).toBe('2026-11-20');
    expect(formatMilestoneDate(achievedAt, 'day', TZ)).toBe('11 月 20 日');
  });

  it('month 精度归一为当月 1 日，不补虚构的日', () => {
    const achievedAt = normalizeMilestoneAchievedAt('2026-11-30', 'month', TZ);
    expect(toLocalDate(achievedAt, TZ)).toBe('2026-11-01');
    const text = formatMilestoneDate(achievedAt, 'month', TZ);
    expect(text).toBe('2026 年 11 月');
    expect(text).not.toContain('日');
  });

  it('闰年 2 月 29 日的 day 精度保留到日', () => {
    const achievedAt = normalizeMilestoneAchievedAt('2024-02-29', 'day', TZ);
    expect(formatMilestoneDate(achievedAt, 'day', TZ)).toBe('2 月 29 日');
  });

  it('不同时区按本地自然日归一', () => {
    const achievedAt = normalizeMilestoneAchievedAt('2026-12-31', 'month', 840);
    expect(toLocalDate(achievedAt, 840)).toBe('2026-12-01');
  });

  it('旧数据 year 精度只渲染到年', () => {
    const achievedAt = normalizeMilestoneAchievedAt('2026-11-20', 'year', TZ);
    expect(formatMilestoneDate(achievedAt, 'year', TZ)).toBe('2026 年');
  });

  it('表单回填：month 返回年月，day 返回年月日', () => {
    const month = normalizeMilestoneAchievedAt('2026-11-20', 'month', TZ);
    const day = normalizeMilestoneAchievedAt('2026-11-20', 'day', TZ);
    expect(milestoneDateInputValue(month, 'month', TZ)).toBe('2026-11');
    expect(milestoneDateInputValue(day, 'day', TZ)).toBe('2026-11-20');
  });

  it('非法日期直接抛错（不写虚构日期）', () => {
    expect(() => normalizeMilestoneAchievedAt('2026-13-01', 'day', TZ)).toThrow();
  });
});
