import { describe, expect, it } from 'vitest';
import {
  milestoneMonthKey,
  milestoneNeighbors,
  orderMilestones,
  orderMilestonesByMonth,
  type OrderableMilestone,
} from './milestone-order';

const TZ = 480;

function localMs(year: number, month: number, day: number): number {
  return Date.UTC(year, month - 1, day) - TZ * 60_000;
}

function milestone(over: Partial<OrderableMilestone> = {}): OrderableMilestone {
  return {
    id: 'm1',
    achievedAt: localMs(2026, 11, 1),
    datePrecision: 'month',
    createdAt: 1_000,
    ...over,
  };
}

describe('里程碑按月排序（M07 OP-05）', () => {
  it('月份键按本地自然日截取', () => {
    expect(milestoneMonthKey(localMs(2026, 11, 30), TZ)).toBe('2026-11');
    expect(milestoneMonthKey(localMs(2027, 1, 1), TZ)).toBe('2027-01');
  });

  it('不同月按月份升序，跨年不串序', () => {
    const rows = [
      milestone({ id: 'nov26', achievedAt: localMs(2026, 11, 1) }),
      milestone({ id: 'dec25', achievedAt: localMs(2025, 12, 1) }),
      milestone({ id: 'jan26', achievedAt: localMs(2026, 1, 1) }),
    ];
    expect(orderMilestonesByMonth(rows, TZ).map((item) => item.milestone.id)).toEqual([
      'dec25',
      'jan26',
      'nov26',
    ]);
  });

  it('同月多个 month 精度按 createdAt 升序，id 兜底', () => {
    const rows = [
      milestone({ id: 'b', createdAt: 2_000 }),
      milestone({ id: 'a', createdAt: 1_000 }),
      milestone({ id: 'c', createdAt: 2_000 }),
    ];
    expect(orderMilestonesByMonth(rows, TZ).map((item) => item.milestone.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('同月混有 day 精度时全部保留，数量守恒', () => {
    const rows = [
      milestone({ id: 'month', datePrecision: 'month', createdAt: 3_000 }),
      milestone({ id: 'day', datePrecision: 'day', createdAt: 1_000 }),
      milestone({ id: 'other', achievedAt: localMs(2026, 12, 1), createdAt: 2_000 }),
    ];
    const ordered = orderMilestonesByMonth(rows, TZ);
    expect(ordered).toHaveLength(rows.length);
    expect(new Set(ordered.map((item) => item.milestone.id))).toEqual(
      new Set(['month', 'day', 'other']),
    );
  });

  it('同一月缩放到同一月份列仍保留全部条目', () => {
    const rows = [milestone({ id: 'a' }), milestone({ id: 'b', createdAt: 2_000 })];
    const keys = orderMilestonesByMonth(rows, TZ).map((item) => item.monthKey);
    expect(new Set(keys)).toEqual(new Set(['2026-11']));
    expect(keys).toHaveLength(2);
  });
});

describe('里程碑前后节点（M07 §4.2）', () => {
  const rows = [
    milestone({ id: 'b', achievedAt: localMs(2026, 11, 2), createdAt: 1_000 }),
    milestone({ id: 'a', achievedAt: localMs(2026, 11, 1), createdAt: 2_000 }),
    milestone({ id: 'c', achievedAt: localMs(2026, 12, 1), createdAt: 1_000 }),
  ];

  it('按 achievedAt、createdAt、id 排序', () => {
    expect(orderMilestones(rows).map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });

  it('返回前后节点', () => {
    expect(milestoneNeighbors(rows, 'b')).toEqual({
      prev: rows.find((item) => item.id === 'a'),
      next: rows.find((item) => item.id === 'c'),
    });
  });

  it('首尾与缺失 id 的边界', () => {
    expect(milestoneNeighbors(rows, 'a').prev).toBeNull();
    expect(milestoneNeighbors(rows, 'c').next).toBeNull();
    expect(milestoneNeighbors(rows, 'missing')).toEqual({ prev: null, next: null });
  });
});
