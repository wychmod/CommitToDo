import { describe, expect, it } from 'vitest';
import { assessReviewReminder } from './review-reminder';

const TZ = 480;
const local = (date: string, hour: number, minute = 0): number =>
  Date.parse(`${date}T00:00:00Z`) + (hour * 60 + minute - TZ) * 60_000;

const assess = (now: number, over: { enabled?: boolean; lastShownDate?: string | null } = {}) =>
  assessReviewReminder({
    now,
    tzOffsetMinutes: TZ,
    enabled: over.enabled ?? true,
    lastShownDate: over.lastShownDate ?? null,
  });

describe('回顾提醒判定（G-02）', () => {
  it('周日 20:00 整触发，19:59 不触发', () => {
    expect(assess(local('2026-11-22', 20)).show).toBe(true);
    expect(assess(local('2026-11-22', 19, 59)).show).toBe(false);
  });

  it('周六 23:59 与周一 00:01 都不触发', () => {
    expect(assess(local('2026-11-21', 23, 59)).show).toBe(false);
    expect(assess(local('2026-11-23', 0, 1)).show).toBe(false);
  });

  it('开关关闭时不提示，重新打开不补发历史提醒', () => {
    expect(assess(local('2026-11-22', 20, 10), { enabled: false }).show).toBe(false);
    expect(assess(local('2026-11-23', 20, 10), { enabled: true }).show).toBe(false);
  });

  it('当日已提示后刷新或重新进入不重复，记录缺失可提示', () => {
    const now = local('2026-11-22', 23, 59);
    const first = assess(now, { lastShownDate: null });
    expect(first).toEqual({ date: '2026-11-22', show: true });
    expect(assess(now, { lastShownDate: first.date }).show).toBe(false);
    expect(assess(local('2026-11-23', 0, 1), { lastShownDate: first.date }).show).toBe(false);
  });

  it('其他日期的记录不妨碍本周日提示', () => {
    expect(assess(local('2026-11-22', 21), { lastShownDate: '2026-11-15' }).show).toBe(true);
  });
});
