import { describe, expect, it } from 'vitest';
import { assessBadges, type BadgeTriggerRows } from './badges';

const AT = Date.UTC(2026, 10, 21, 9, 0);
const TZ = 480;
const EMPTY: BadgeTriggerRows = { branches: [], commits: [], milestones: [] };

function branch(over: Partial<BadgeTriggerRows['branches'][number]> & { id: string }) {
  return {
    parentId: null,
    depth: 1,
    title: over.id,
    status: 'active' as const,
    createdAt: AT,
    finishedAt: null,
    finishedIntoId: null,
    droppedAt: null,
    dropReason: null,
    archivedAt: null,
    deletedAt: null,
    ...over,
  };
}

function commit(over: Partial<BadgeTriggerRows['commits'][number]> & { id: string }) {
  return {
    branchId: 'b1',
    summary: over.id,
    date: '2026-11-21',
    at: AT,
    voidedAt: null,
    deletedAt: null,
    ...over,
  };
}

function milestone(over: Partial<BadgeTriggerRows['milestones'][number]> & { id: string }) {
  return {
    branchId: 'b1',
    title: over.id,
    note: null,
    achievedAt: AT,
    datePrecision: 'day' as const,
    createdAt: AT,
    deletedAt: null,
    ...over,
  };
}

describe('assessBadges（V1-05 聚合）', () => {
  it('空数据也给出 16 枚的进度，不产生候选', () => {
    const result = assessBadges(EMPTY, AT, TZ);

    expect(result.candidates).toEqual([]);
    expect(result.progress).toHaveLength(16);
  });

  it('候选按目录顺序排列', () => {
    const rows: BadgeTriggerRows = {
      branches: [
        branch({ id: 'root', depth: 0 }),
        branch({ id: 'b1', parentId: 'root', depth: 1 }),
      ],
      commits: [commit({ id: 'c1', branchId: 'b1' })],
      milestones: [milestone({ id: 'm1', branchId: 'b1' })],
    };

    const result = assessBadges(rows, AT, TZ);

    expect(result.candidates.map((item) => item.catalogId)).toEqual([
      'first-commit',
      'first-milestone',
    ]);
  });

  it('汇聚三类模块的进度，按目录顺序合并', () => {
    const rows: BadgeTriggerRows = {
      branches: [
        branch({ id: 'root', depth: 0, createdAt: Date.UTC(2025, 10, 21) }),
        branch({ id: 'b1', parentId: 'root', depth: 1 }),
      ],
      commits: [commit({ id: 'c1', branchId: 'b1' })],
      milestones: [
        milestone({ id: 'm1', branchId: 'b1' }),
        milestone({ id: 'm2', branchId: 'b1', achievedAt: AT + 1_000 }),
      ],
    };

    const result = assessBadges(rows, AT, TZ);
    const byId = new Map(result.progress.map((row) => [row.catalogId, row]));

    expect(byId.get('first-commit')).toEqual({ catalogId: 'first-commit', current: 1, target: 1 });
    expect(byId.get('first-fork')).toEqual({ catalogId: 'first-fork', current: 0, target: 1 });
    expect(byId.get('three-milestones')).toEqual({
      catalogId: 'three-milestones',
      current: 2,
      target: 3,
    });
  });
});
