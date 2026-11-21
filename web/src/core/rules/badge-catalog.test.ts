import { describe, expect, it } from 'vitest';
import {
  BADGE_CATALOG,
  BADGE_CATALOG_SIZE,
  BADGE_CATEGORY_ORDER,
  BADGE_PERIOD_ALL,
  badgesInCategory,
  buildBadgeWall,
} from './badge-catalog';

const AT = Date.UTC(2026, 10, 21, 9, 0);

describe('徽章目录（V1-05 §4.1 / R18）', () => {
  it('恰好 21 项（16 枚常规 + 5 枚彩蛋）且 catalogId 唯一', () => {
    expect(BADGE_CATALOG_SIZE).toBe(21);
    expect(new Set(BADGE_CATALOG.map((entry) => entry.catalogId)).size).toBe(21);
  });

  it('分类分布为结构 8 / 时间 4 / 里程碑 4 / 彩蛋 5', () => {
    expect(BADGE_CATEGORY_ORDER).toEqual(['structure', 'time', 'milestone', 'easter']);
    expect(badgesInCategory('structure')).toHaveLength(8);
    expect(badgesInCategory('time')).toHaveLength(4);
    expect(badgesInCategory('milestone')).toHaveLength(4);
    expect(badgesInCategory('easter')).toHaveLength(5);
  });

  it('周期键统一为 all，彩蛋排在目录末尾', () => {
    expect(BADGE_PERIOD_ALL).toBe('all');
    expect(BADGE_CATALOG.slice(-5).map((entry) => entry.catalogId)).toEqual([
      'night-flight',
      'cross-year',
      'blank-year',
      'revival',
      'full-moon',
    ]);
  });
});

describe('徽章墙派生（V1-05 §4.2 / OP-01）', () => {
  it('0 枚已获得时页头为 0 / 21，彩蛋分类不出现任何条目', () => {
    const wall = buildBadgeWall([], []);

    expect(wall.total).toBe(21);
    expect(wall.earnedCount).toBe(0);
    expect(wall.groups.map((group) => group.total)).toEqual([8, 4, 4, 5]);
    const easter = wall.groups[3]!;
    expect(easter.items).toEqual([]);
    expect(easter.earnedCount).toBe(0);
    const structure = wall.groups[0]!;
    expect(structure.items.map((item) => item.catalogId)).toEqual([
      'first-fork',
      'first-merge',
      'all-merged',
      'dual-lanes',
      'let-go',
      'well-ended',
      'five-faces',
      'trunk',
    ]);
  });

  it('已获得按 grantedAt 倒序，未获得排在后面', () => {
    const wall = buildBadgeWall(
      [
        { id: 'b1', catalogId: 'first-fork', grantedAt: AT },
        { id: 'b2', catalogId: 'first-merge', grantedAt: AT + 10_000 },
      ],
      [],
    );
    const structure = wall.groups[0]!;

    expect(wall.earnedCount).toBe(2);
    expect(structure.items.slice(0, 2).map((item) => item.catalogId)).toEqual([
      'first-merge',
      'first-fork',
    ]);
    expect(structure.items[2]!.earned).toBeNull();
  });

  it('旧标识 first-branch 归一到 first-fork，不重复计数', () => {
    const wall = buildBadgeWall(
      [
        { id: 'old', catalogId: 'first-branch', grantedAt: AT + 20_000 },
        { id: 'new', catalogId: 'first-fork', grantedAt: AT },
      ],
      [],
    );

    expect(wall.earnedCount).toBe(1);
    const structure = wall.groups[0]!;
    expect(structure.items[0]).toMatchObject({
      catalogId: 'first-fork',
      earned: { id: 'new', grantedAt: AT },
    });
  });

  it('达成度恰好 50% 时显示「还差 N」', () => {
    const wall = buildBadgeWall([], [{ catalogId: 'first-year', current: 183, target: 366 }]);
    const time = wall.groups[1]!;
    const item = time.items.find((entry) => entry.catalogId === 'first-year')!;

    expect(item.remaining).toBe(183);
    expect(item.percent).toBeCloseTo(0.5);
  });

  it('达成度低于 50% 时不给差距，只保留灰点信息', () => {
    const wall = buildBadgeWall([], [{ catalogId: 'year-marks', current: 1, target: 3 }]);
    const milestone = wall.groups[2]!;
    const item = milestone.items.find((entry) => entry.catalogId === 'year-marks')!;

    expect(item.remaining).toBeNull();
    expect(item.percent).toBeCloseTo(1 / 3);
  });
});
