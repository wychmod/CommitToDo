import { toLocalDate } from '@/core/clock';

/**
 * 里程碑排序（M07 §4.1 / OP-05）。
 *
 * 时间树按月列分组：不同月按月份升序；同月内多个 `month` 精度按 `createdAt`
 * 升序，`id` 兜底保证稳定。渲染层可把同月节点聚簇，但排序与详情顺序不变。
 * 详情的前后节点按 `achievedAt`、`createdAt`、`id` 排序。
 */

export interface OrderableMilestone {
  id: string;
  achievedAt: number;
  datePrecision: 'day' | 'month' | 'year';
  createdAt: number;
}

export function milestoneMonthKey(achievedAt: number, tzOffsetMinutes: number): string {
  return toLocalDate(achievedAt, tzOffsetMinutes).slice(0, 7);
}

export interface OrderedMilestone<T extends OrderableMilestone> {
  milestone: T;
  monthKey: string;
}

export function orderMilestonesByMonth<T extends OrderableMilestone>(
  milestones: readonly T[],
  tzOffsetMinutes: number,
): Array<OrderedMilestone<T>> {
  return milestones
    .map((milestone) => ({
      milestone,
      monthKey: milestoneMonthKey(milestone.achievedAt, tzOffsetMinutes),
    }))
    .sort(
      (a, b) =>
        a.monthKey.localeCompare(b.monthKey) ||
        a.milestone.createdAt - b.milestone.createdAt ||
        a.milestone.id.localeCompare(b.milestone.id),
    );
}

export function orderMilestones<T extends OrderableMilestone>(milestones: readonly T[]): T[] {
  return [...milestones].sort(
    (a, b) => a.achievedAt - b.achievedAt || a.createdAt - b.createdAt || a.id.localeCompare(b.id),
  );
}

export interface MilestoneNeighbors<T> {
  prev: T | null;
  next: T | null;
}

export function milestoneNeighbors<T extends OrderableMilestone>(
  milestones: readonly T[],
  currentId: string,
): MilestoneNeighbors<T> {
  const ordered = orderMilestones(milestones);
  const index = ordered.findIndex((item) => item.id === currentId);
  if (index < 0) return { prev: null, next: null };
  return {
    prev: ordered[index - 1] ?? null,
    next: ordered[index + 1] ?? null,
  };
}
