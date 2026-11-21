import { describe, expect, it } from 'vitest';
import {
  computeYearMetrics,
  createLevelOneResolver,
  isYearCommit,
  localYearOf,
  type YearBranchRecord,
  type YearCommitRecord,
} from './year-metrics';

/**
 * 年轮四项指标（PRD V1-02 §8.2）。
 *
 * 提交按业务日期归年；新开与收尾按本地时间归年；子分支提交归并到一级祖先。
 */

const TZ = 480;

function branchRow(
  over: Partial<YearBranchRecord> & Pick<YearBranchRecord, 'id' | 'parentId' | 'depth'>,
): YearBranchRecord {
  return {
    status: 'active',
    createdAt: Date.UTC(2026, 0, 1),
    finishedAt: null,
    deletedAt: null,
    ...over,
  };
}

function commitRow(
  over: Partial<YearCommitRecord> & Pick<YearCommitRecord, 'branchId' | 'date'>,
): YearCommitRecord {
  return { voidedAt: null, deletedAt: null, ...over };
}

describe('年轮四项指标（R3 / R11）', () => {
  const root = branchRow({ id: 'root', parentId: null, depth: 0 });
  const levelOne = branchRow({ id: 'l1', parentId: 'root', depth: 1 });
  const levelTwo = branchRow({ id: 'l2', parentId: 'l1', depth: 2 });

  it('提交按业务日期的年份归类，12 月 31 日与次年 1 月 1 日分开', () => {
    const commits = [
      commitRow({ branchId: 'l1', date: '2026-12-31' }),
      commitRow({ branchId: 'l1', date: '2027-01-01' }),
    ];
    const metrics = computeYearMetrics({
      year: 2026,
      commits,
      branches: [root, levelOne],
      tzOffsetMinutes: TZ,
    });
    expect(metrics.commits).toBe(1);
    expect(isYearCommit(commits[1]!, 2026)).toBe(false);
  });

  it('全部提交被撤销时四项指标归零', () => {
    const oldLevelOne = branchRow({
      id: 'l1',
      parentId: 'root',
      depth: 1,
      createdAt: Date.UTC(2025, 0, 1),
    });
    const oldLevelTwo = branchRow({
      id: 'l2',
      parentId: 'l1',
      depth: 2,
      createdAt: Date.UTC(2025, 0, 2),
    });
    const metrics = computeYearMetrics({
      year: 2026,
      commits: [
        commitRow({ branchId: 'l1', date: '2026-03-01', voidedAt: Date.UTC(2026, 2, 2) }),
        commitRow({ branchId: 'l2', date: '2026-04-01', voidedAt: Date.UTC(2026, 3, 2) }),
      ],
      branches: [
        branchRow({ id: 'root', parentId: null, depth: 0, createdAt: Date.UTC(2025, 0, 1) }),
        oldLevelOne,
        oldLevelTwo,
      ],
      tzOffsetMinutes: TZ,
    });
    expect(metrics).toEqual({
      commits: 0,
      activeLevelOneBranches: 0,
      opened: 0,
      finished: 0,
    });
  });

  it('只有根分支提交时提交数照常，活跃一级分支数为 0', () => {
    const metrics = computeYearMetrics({
      year: 2026,
      commits: [
        commitRow({ branchId: 'root', date: '2026-02-01' }),
        commitRow({ branchId: 'root', date: '2026-02-02' }),
      ],
      branches: [root],
      tzOffsetMinutes: TZ,
    });
    expect(metrics.commits).toBe(2);
    expect(metrics.activeLevelOneBranches).toBe(0);
  });

  it('一级分支的提交全部来自二级子分支时仍计为 1 条活跃一级分支', () => {
    const metrics = computeYearMetrics({
      year: 2026,
      commits: [
        commitRow({ branchId: 'l2', date: '2026-03-01' }),
        commitRow({ branchId: 'l2', date: '2026-03-02' }),
      ],
      branches: [root, levelOne, levelTwo],
      tzOffsetMinutes: TZ,
    });
    expect(metrics.activeLevelOneBranches).toBe(1);
    expect(createLevelOneResolver([root, levelOne, levelTwo])('l2')).toBe('l1');
  });

  it('新开排除根分支与已删除分支', () => {
    const deleted = branchRow({
      id: 'gone',
      parentId: 'root',
      depth: 1,
      deletedAt: Date.UTC(2026, 5, 1),
    });
    const old = branchRow({
      id: 'old',
      parentId: 'root',
      depth: 1,
      createdAt: Date.UTC(2025, 5, 1),
    });
    const metrics = computeYearMetrics({
      year: 2026,
      commits: [],
      branches: [root, levelOne, deleted, old],
      tzOffsetMinutes: TZ,
    });
    expect(metrics.opened).toBe(1);
  });

  it('收尾只计 status=merged 且 finishedAt 在该年的分支，放下不计入', () => {
    const merged = branchRow({
      id: 'merged',
      parentId: 'root',
      depth: 1,
      status: 'merged',
      finishedAt: Date.UTC(2026, 4, 1),
    });
    const dropped = branchRow({
      id: 'dropped',
      parentId: 'root',
      depth: 1,
      status: 'dropped',
      finishedAt: Date.UTC(2026, 4, 2),
    });
    const earlier = branchRow({
      id: 'earlier',
      parentId: 'root',
      depth: 1,
      status: 'merged',
      finishedAt: Date.UTC(2025, 4, 1),
    });
    const deleted = branchRow({
      id: 'deleted',
      parentId: 'root',
      depth: 1,
      status: 'merged',
      finishedAt: Date.UTC(2026, 4, 3),
      deletedAt: Date.UTC(2026, 4, 4),
    });
    const metrics = computeYearMetrics({
      year: 2026,
      commits: [],
      branches: [root, merged, dropped, earlier, deleted],
      tzOffsetMinutes: TZ,
    });
    expect(metrics.finished).toBe(1);
  });

  it('已归档分支的历史提交照常计入提交数与活跃一级分支数', () => {
    const archived = branchRow({
      id: 'archived',
      parentId: 'root',
      depth: 1,
      createdAt: Date.UTC(2025, 0, 1),
    });
    const metrics = computeYearMetrics({
      year: 2026,
      commits: [commitRow({ branchId: 'archived', date: '2026-01-10' })],
      branches: [root, archived],
      tzOffsetMinutes: TZ,
    });
    expect(metrics.commits).toBe(1);
    expect(metrics.activeLevelOneBranches).toBe(1);
  });

  it('新开按本地时间归年：UTC 12 月 31 日晚间在东八区已是次年', () => {
    const createdAt = Date.UTC(2026, 11, 31, 20, 0);
    expect(localYearOf(createdAt, TZ)).toBe(2027);
    const metrics = computeYearMetrics({
      year: 2026,
      commits: [],
      branches: [root, branchRow({ id: 'late', parentId: 'root', depth: 1, createdAt })],
      tzOffsetMinutes: TZ,
    });
    expect(metrics.opened).toBe(0);
  });
});
