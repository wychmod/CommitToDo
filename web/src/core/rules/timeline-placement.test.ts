import { describe, expect, it } from 'vitest';
import {
  milestoneAnchor,
  orderLanes,
  placeBranchEnd,
  placeBranchStart,
  rootLaneVisible,
  type PlacementBranch,
} from './timeline-placement';

const TZ = 480;
/** 本地时间转 UTC 毫秒：东八区正午用 `Date.UTC(y, m, d, 12) - 8h` 不影响日期。 */
function localMs(year: number, month: number, day: number): number {
  return Date.UTC(year, month - 1, day) - TZ * 60_000;
}

function branch(over: Partial<PlacementBranch> = {}): PlacementBranch {
  return {
    id: 'work',
    parentId: 'root',
    status: 'active',
    order: 1,
    createdAt: localMs(2026, 11, 1),
    finishedAt: null,
    finishedIntoId: null,
    archivedAt: null,
    droppedAt: null,
    ...over,
  };
}

describe('分叉与合回定位（M06 §5 / OP-01）', () => {
  const range = { start: '2026-11-10', end: '2026-11-21' };

  it('分叉点用 createdAt、合回点用 finishedAt', () => {
    const row = branch({ finishedAt: localMs(2026, 11, 18), finishedIntoId: 'root' });
    expect(placeBranchStart(row, range, TZ)?.date).toBe('2026-11-10');
    expect(placeBranchEnd(row, range, TZ)?.date).toBe('2026-11-18');
  });

  it('区间开始前创建的分支截断在左边界，不虚构日期', () => {
    const point = placeBranchStart(branch(), range, TZ);
    expect(point).toEqual({ date: '2026-11-10', clampedAtStart: true });
  });

  it('创建日与首条提交同日时仍落在当天', () => {
    const row = branch({ createdAt: localMs(2026, 11, 15) });
    expect(placeBranchStart(row, range, TZ)).toEqual({
      date: '2026-11-15',
      clampedAtStart: false,
    });
  });

  it('收尾日超出区间右界时不产生合回点', () => {
    const row = branch({ finishedAt: localMs(2026, 11, 25), finishedIntoId: 'root' });
    expect(placeBranchEnd(row, range, TZ)).toBeNull();
  });

  it('历史数据缺少合并去向时仍能定位合回日期', () => {
    const row = branch({ finishedAt: localMs(2026, 11, 18), finishedIntoId: null });
    expect(placeBranchEnd(row, range, TZ)?.date).toBe('2026-11-18');
  });
});

describe('里程碑精度（R6）', () => {
  it('month 精度对齐当月 1 日，不补虚构的日', () => {
    const achievedAt = localMs(2026, 11, 20);
    expect(milestoneAnchor(achievedAt, 'month', TZ)).toBe('2026-11-01');
  });

  it('month 精度落在区间首月时仍在首月内', () => {
    const achievedAt = localMs(2026, 11, 20);
    const anchor = milestoneAnchor(achievedAt, 'month', TZ);
    expect(anchor >= '2026-11-01' && anchor <= '2026-11-30').toBe(true);
  });

  it('day 精度保留具体日期', () => {
    expect(milestoneAnchor(localMs(2026, 11, 20), 'day', TZ)).toBe('2026-11-20');
  });
});

describe('根泳道与泳道排序（M06 §4.1）', () => {
  it('根有有效提交、里程碑或合并时出现', () => {
    expect(rootLaneVisible('root', [{ branchId: 'root', voidedAt: null }], [], [])).toBe(true);
    expect(rootLaneVisible('root', [], [{ branchId: 'root' }], [])).toBe(true);
    expect(rootLaneVisible('root', [], [], [branch({ id: 'work', finishedIntoId: 'root' })])).toBe(
      true,
    );
  });

  it('根无活动时不出现，撤销的提交不算活动', () => {
    expect(rootLaneVisible('root', [{ branchId: 'root', voidedAt: 10 }], [], [])).toBe(false);
    expect(rootLaneVisible('root', [], [], [])).toBe(false);
  });

  it('根在上，一级分支按 order', () => {
    const rows = [
      branch({ id: 'life', order: 2 }),
      branch({ id: 'work', order: 1 }),
      branch({ id: 'root', parentId: null, order: 0 }),
    ];
    expect(orderLanes('root', rows).map((row) => row.id)).toEqual(['root', 'work', 'life']);
  });
});
