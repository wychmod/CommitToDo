import { describe, expect, it } from 'vitest';
import {
  computeWeeklySummary,
  type WeeklySummaryBranch,
  type WeeklySummaryCommit,
} from './weekly-summary';

const TZ = 480;

function commit(over: Partial<WeeklySummaryCommit> = {}): WeeklySummaryCommit {
  return {
    id: 'c1',
    branchId: 'a',
    date: '2026-11-18',
    at: 1,
    voidedAt: null,
    deletedAt: null,
    ...over,
  };
}

function branch(over: Partial<WeeklySummaryBranch> = {}): WeeklySummaryBranch {
  return {
    id: 'a',
    parentId: null,
    title: 'A',
    status: 'active',
    createdAt: 0,
    archivedAt: null,
    droppedAt: null,
    deletedAt: null,
    ...over,
  };
}

const summarize = (
  todayDate: string,
  commits: WeeklySummaryCommit[],
  branches: WeeklySummaryBranch[] = [],
) => computeWeeklySummary({ todayDate, commits, branches, tzOffsetMinutes: TZ });

describe('本周摘要（R3 / R4）', () => {
  it('窗口从周一 00:00 到当前日期，只计未撤销且未删除的提交', () => {
    const result = summarize('2026-11-18', [
      commit({ id: 'before', date: '2026-11-15' }),
      commit({ id: 'monday', date: '2026-11-16' }),
      commit({ id: 'today', date: '2026-11-18' }),
      commit({ id: 'future', date: '2026-11-19' }),
      commit({ id: 'voided', voidedAt: 2 }),
      commit({ id: 'deleted', deletedAt: 2 }),
    ]);
    expect(result).toMatchObject({
      weekStart: '2026-11-16',
      weekEnd: '2026-11-18',
      commitCount: 2,
    });
  });

  it('周一与周日 23:59 各自属于对应自然周', () => {
    expect(summarize('2026-11-16', [commit({ date: '2026-11-16' })]).commitCount).toBe(1);
    expect(
      summarize('2026-11-22', [
        commit({ id: 'mon', date: '2026-11-16' }),
        commit({ id: 'sun', date: '2026-11-22' }),
      ]).commitCount,
    ).toBe(2);
    expect(summarize('2026-11-23', [commit({ date: '2026-11-22' })]).commitCount).toBe(0);
  });

  it('本周无提交仍返回 0 与停滞信息', () => {
    const result = summarize('2026-11-18', [commit({ date: '2026-11-15' })], [branch({ id: 'a' })]);
    expect(result.commitCount).toBe(0);
    expect(result.stallCount).toBe(0);
  });

  it('停滞恰好 30 天不计，31 天计入', () => {
    const result = summarize(
      '2026-11-18',
      [
        commit({ id: '30', branchId: 'thirty', date: '2026-10-19', at: 1 }),
        commit({ id: '31', branchId: 'thirtyOne', date: '2026-10-18', at: 2 }),
      ],
      [branch({ id: 'thirty' }), branch({ id: 'thirtyOne', title: '三十一' })],
    );
    expect(result.stallCount).toBe(1);
    expect(result.stalledBranches).toEqual([{ branchId: 'thirtyOne', title: '三十一', days: 31 }]);
  });

  it('已归档、已放下、已合并及归档祖先下的分支不计停滞', () => {
    const rows = [
      branch({ id: 'archived', archivedAt: 1 }),
      branch({ id: 'dropped', status: 'dropped', droppedAt: 1 }),
      branch({ id: 'merged', status: 'merged' }),
      branch({ id: 'parent', archivedAt: 1 }),
      branch({ id: 'child', parentId: 'parent' }),
    ];
    const commits = rows.map((row, index) =>
      commit({ id: row.id, branchId: row.id, date: '2026-09-01', at: index + 1 }),
    );
    expect(summarize('2026-11-18', commits, rows).stallCount).toBe(0);
  });

  it('完整计数不被名称上限截断，名称最多三个并按天数降序', () => {
    const branches = ['a', 'b', 'c', 'd'].map((id, index) =>
      branch({ id, title: id.toUpperCase(), createdAt: index }),
    );
    const commits = branches.map((row, index) =>
      commit({ id: row.id, branchId: row.id, date: `2026-08-0${index + 1}`, at: index + 1 }),
    );
    const result = summarize('2026-11-18', commits, branches);
    expect(result.stallCount).toBe(4);
    expect(result.stalledBranches.map((row) => row.branchId)).toEqual(['a', 'b', 'c']);
  });
});
