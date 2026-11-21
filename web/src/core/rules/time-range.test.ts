import { describe, expect, it } from 'vitest';
import { addDays } from '@/core/clock';
import { daysBetween, inTimeRange, resolveTimeRange } from './time-range';

describe('历程时间范围（M06 §5 / OP-04）', () => {
  it('近 90 天含今天往前共 90 个自然日', () => {
    const range = resolveTimeRange('recent90', '2026-11-21');
    expect(range.start).toBe('2026-08-24');
    expect(daysBetween(range.start!, range.end)).toBe(89);
    expect(range.start).not.toBe('2026-08-23');
    expect(range.start).not.toBe('2026-08-25');
  });

  it('今天为 1 月 1 日时，「今年」起点落在上一年', () => {
    const range = resolveTimeRange('thisYear', '2026-01-01');
    expect(range.start).toBe('2025-10-04');
    expect(range.start! < '2026-01-01').toBe(true);
  });

  it('今天为 4 月 1 日时，「今年」取 1 月 1 日', () => {
    const range = resolveTimeRange('thisYear', '2026-04-01');
    expect(range.start).toBe('2026-01-01');
  });

  it('闰年 2 月末仍按 90 个自然日回推', () => {
    const range = resolveTimeRange('recent90', '2024-02-29');
    expect(daysBetween(range.start!, range.end)).toBe(89);
    expect(range.start).toBe(addDays('2024-02-29', -89));
  });

  it('「全部」没有下界', () => {
    const range = resolveTimeRange('all', '2026-11-21');
    expect(range.start).toBeNull();
    expect(range.end).toBe('2026-11-21');
  });

  it('边界日 00:00 含入范围', () => {
    const range = resolveTimeRange('recent90', '2026-11-21');
    expect(inTimeRange(range, range.start!)).toBe(true);
    expect(inTimeRange(range, range.end)).toBe(true);
    expect(inTimeRange(range, '2026-08-23')).toBe(false);
    expect(inTimeRange(range, '2026-11-22')).toBe(false);
  });
});
