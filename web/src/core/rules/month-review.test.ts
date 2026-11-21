import { describe, expect, it } from 'vitest';
import {
  buildMonthReview,
  monthBounds,
  shiftMonthKey,
  type MonthReviewBranch,
  type MonthReviewCommit,
} from './month-review';

const TZ = 480;
const at = (date: string): number => Date.parse(`${date}T00:00:00Z`) - TZ * 60_000;

function branch(
  over: Partial<MonthReviewBranch> & Pick<MonthReviewBranch, 'id'>,
): MonthReviewBranch {
  return {
    parentId: 'root',
    depth: 1,
    title: over.id,
    color: 'sky',
    status: 'active',
    archivedAt: null,
    droppedAt: null,
    createdAt: at('2026-01-01'),
    finishedAt: null,
    deletedAt: null,
    taskDone: 0,
    taskTotal: 0,
    ...over,
  };
}

function commit(
  over: Partial<MonthReviewCommit> & Pick<MonthReviewCommit, 'id' | 'date'>,
): MonthReviewCommit {
  return {
    branchId: 'a',
    at: at(over.date),
    voidedAt: null,
    deletedAt: null,
    ...over,
  };
}

const root = branch({ id: 'root', parentId: null, depth: 0, title: '我' });
const a = branch({ id: 'a', title: '甲' });
const b = branch({ id: 'b', title: '乙' });
const child = branch({ id: 'child', parentId: 'a', depth: 2, title: '子分支' });

const review = (monthKey: string, commits: MonthReviewCommit[], branches = [root, a, b, child]) =>
  buildMonthReview({ monthKey, commits, branches, tzOffsetMinutes: TZ });

describe('月回顾（R10）', () => {
  it('子分支提交归到一级祖先，根分支单独归我', () => {
    const result = review('2026-10', [
      commit({ id: '1', branchId: 'child', date: '2026-10-01' }),
      commit({ id: '2', branchId: 'child', date: '2026-10-02' }),
      commit({ id: '3', branchId: 'root', date: '2026-10-03' }),
      commit({ id: '4', branchId: 'a', date: '2026-11-01' }),
    ]);
    expect(result.total).toBe(3);
    expect(result.shares.find((share) => share.branchId === 'a')).toMatchObject({
      commits: 2,
      ratio: 2 / 3,
    });
    expect(result.shares.find((share) => share.branchId === null)?.commits).toBe(1);
  });

  it('结构分别读新建、合并收尾与放下，放下不计收尾', () => {
    const branches = [
      root,
      branch({ id: 'new1', createdAt: at('2026-10-02') }),
      branch({ id: 'new2', createdAt: at('2026-10-31') }),
      branch({ id: 'done', status: 'merged', finishedAt: at('2026-10-20') }),
      branch({
        id: 'drop',
        status: 'dropped',
        droppedAt: at('2026-10-21'),
        finishedAt: at('2026-10-21'),
      }),
    ];
    expect(review('2026-10', [], branches).structure).toEqual({
      opened: 2,
      finished: 1,
      dropped: 1,
    });
    expect(review('2026-10', [], [root, a]).structure).toEqual({
      opened: 0,
      finished: 0,
      dropped: 0,
    });
  });

  it('停滞以月末为今天，之后新增提交不改变历史月', () => {
    const old = commit({ id: 'old', branchId: 'a', date: '2026-09-01' });
    const before = review('2026-10', [old], [a]);
    const after = review(
      '2026-10',
      [old, commit({ id: 'new', branchId: 'a', date: '2026-11-21' })],
      [a],
    );
    expect(before.stall).toEqual({ count: 1, longestDays: 60 });
    expect(after.stall).toEqual(before.stall);
  });

  it('占比差值恰好 10 个百分点标方向，5 个百分点不强调', () => {
    const commits = [
      ...Array.from({ length: 5 }, (_, i) =>
        commit({ id: `pa${i}`, branchId: 'a', date: '2026-09-01' }),
      ),
      ...Array.from({ length: 5 }, (_, i) =>
        commit({ id: `pb${i}`, branchId: 'b', date: '2026-09-02' }),
      ),
      ...Array.from({ length: 6 }, (_, i) =>
        commit({ id: `ca${i}`, branchId: 'a', date: '2026-10-01' }),
      ),
      ...Array.from({ length: 4 }, (_, i) =>
        commit({ id: `cb${i}`, branchId: 'b', date: '2026-10-02' }),
      ),
    ];
    const result = review('2026-10', commits);
    expect(result.shares.find((share) => share.branchId === 'a')).toMatchObject({
      direction: 'up',
    });
    expect(result.shares.find((share) => share.branchId === 'b')).toMatchObject({
      direction: 'down',
    });

    const fivePointCommits = [
      ...Array.from({ length: 10 }, (_, i) =>
        commit({ id: `prevA${i}`, branchId: 'a', date: '2026-09-01' }),
      ),
      ...Array.from({ length: 10 }, (_, i) =>
        commit({ id: `prevB${i}`, branchId: 'b', date: '2026-09-02' }),
      ),
      ...Array.from({ length: 11 }, (_, i) =>
        commit({ id: `curA${i}`, branchId: 'a', date: '2026-10-01' }),
      ),
      ...Array.from({ length: 9 }, (_, i) =>
        commit({ id: `curB${i}`, branchId: 'b', date: '2026-10-02' }),
      ),
    ];
    expect(
      review('2026-10', fivePointCommits).shares.every((share) => share.direction === null),
    ).toBe(true);
  });

  it('Top1 占比 50% 为集中，30% 为均匀，连续出现作为次优先模板', () => {
    const fifty = review('2026-10', [
      commit({ id: '1', branchId: 'a', date: '2026-10-01' }),
      commit({ id: '2', branchId: 'b', date: '2026-10-02' }),
    ]);
    expect(fifty.observation).toMatchObject({ type: 'concentrated', branchId: 'a' });

    const c = branch({ id: 'c', title: '丙' });
    const d = branch({ id: 'd', title: '丁' });
    const thirtyCommits = [
      ...['a', 'b', 'c'].flatMap((branchId) =>
        Array.from({ length: 3 }, (_, i) =>
          commit({ id: `${branchId}${i}`, branchId, date: '2026-10-01' }),
        ),
      ),
      commit({ id: 'd1', branchId: 'd', date: '2026-10-02' }),
    ];
    expect(review('2026-10', thirtyCommits, [root, a, b, c, d]).observation).toMatchObject({
      type: 'balanced',
    });

    const continuous = review(
      '2026-10',
      [
        commit({ id: 'a1', branchId: 'a', date: '2026-10-01' }),
        commit({ id: 'a2', branchId: 'a', date: '2026-10-02' }),
        commit({ id: 'a3', branchId: 'a', date: '2026-10-08' }),
        commit({ id: 'a4', branchId: 'a', date: '2026-10-15' }),
        ...Array.from({ length: 3 }, (_, i) =>
          commit({ id: `b${i}`, branchId: 'b', date: `2026-10-0${i + 1}` }),
        ),
        ...Array.from({ length: 3 }, (_, i) =>
          commit({ id: `c${i}`, branchId: 'c', date: `2026-10-2${i + 1}` }),
        ),
      ],
      [root, a, b, c],
    );
    expect(continuous.observation).toEqual({ type: 'continuity', branchId: 'a', weeks: 3 });
  });

  it('无提交月仍给结构、停滞与唯一空月观察', () => {
    const result = review('2026-10', []);
    expect(result.total).toBe(0);
    expect(result.shares).toEqual([]);
    expect(result.observation).toEqual({ type: 'empty' });
  });

  it('跨年 12 月与上一月比较、月末日期均正确', () => {
    expect(shiftMonthKey('2027-01', -1)).toBe('2026-12');
    expect(monthBounds('2026-12')).toEqual({ monthStart: '2026-12-01', monthEnd: '2026-12-31' });
    const result = review('2027-01', [
      commit({ id: 'dec', branchId: 'a', date: '2026-12-31' }),
      commit({ id: 'jan', branchId: 'a', date: '2027-01-01' }),
    ]);
    expect(result.total).toBe(1);
    expect(result.monthEnd).toBe('2027-01-31');
  });
});
