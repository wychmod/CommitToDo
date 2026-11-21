import { describe, expect, it } from 'vitest';
import {
  assessWeekReview,
  collectWeekCommits,
  isWeekReviewDay,
  weekDayOf,
  weekStartOf,
  type WeekReviewBranch,
  type WeekReviewCommit,
} from './week-review';

const commit = (over: Partial<WeekReviewCommit> = {}): WeekReviewCommit => ({
  id: 'commit',
  branchId: 'a',
  date: '2026-11-21',
  at: 1_000,
  voidedAt: null,
  ...over,
});

const branch = (over: Partial<WeekReviewBranch> = {}): WeekReviewBranch => ({
  id: 'a',
  status: 'active',
  ...over,
});

const assess = (
  todayDate: string,
  commits: WeekReviewCommit[],
  branches: WeekReviewBranch[] = [],
) => assessWeekReview({ todayDate, commits, branches });

describe('周回顾统计（R3 / R9 / OP-01、OP-02、OP-06）', () => {
  it('周六出现，统计本周有效提交并去重活跃分支', () => {
    const result = assess(
      '2026-11-21',
      [commit({ id: '1' }), commit({ id: '2' }), commit({ id: '3' })],
      [branch()],
    );

    expect(result).toMatchObject({
      visible: true,
      weekStart: '2026-11-16',
      weekEnd: '2026-11-22',
      commitCount: 3,
      activeBranchCount: 1,
      streakWeeks: 1,
    });
  });

  it('周日仍出现，周一 00:00 起不出现', () => {
    const commits = [
      commit({ id: 'sun', date: '2026-11-22' }),
      commit({ id: 'mon', date: '2026-11-23' }),
    ];

    expect(assess('2026-11-22', commits, [branch()]).commitCount).toBe(1);
    expect(assess('2026-11-23', commits, [branch()]).visible).toBe(false);
  });

  it('工作日不出现，本周无提交也不出现', () => {
    expect(isWeekReviewDay('2026-11-20')).toBe(false);
    expect(assess('2026-11-20', [commit()], [branch()]).visible).toBe(false);
    expect(assess('2026-11-21', [], [branch()]).visible).toBe(false);
  });

  it('本周提交全部被撤销时不出现', () => {
    const result = assess(
      '2026-11-21',
      [commit({ id: '1', voidedAt: 2_000 }), commit({ id: '2', voidedAt: 3_000 })],
      [branch()],
    );
    expect(result.visible).toBe(false);
    expect(result.commitCount).toBe(0);
  });

  it('已归档与已合并分支照常计入活跃分支，已放下分支只计提交', () => {
    const result = assess(
      '2026-11-21',
      [
        commit({ id: '1', branchId: 'archived' }),
        commit({ id: '2', branchId: 'merged' }),
        commit({ id: '3', branchId: 'dropped' }),
        commit({ id: '4', branchId: 'dropped' }),
      ],
      [
        branch({ id: 'archived', status: 'active' }),
        branch({ id: 'merged', status: 'merged' }),
        branch({ id: 'dropped', status: 'dropped' }),
      ],
    );

    expect(result.commitCount).toBe(4);
    expect(result.activeBranchCount).toBe(2);
  });

  it('连续周数从本周往前逐周检查，遇第一个空周停止', () => {
    const result = assess(
      '2026-11-21',
      [
        commit({ id: 'this', date: '2026-11-18' }),
        commit({ id: 'last', date: '2026-11-10' }),
        commit({ id: 'three', date: '2026-10-27' }),
      ],
      [branch()],
    );

    expect(result.streakWeeks).toBe(2);
  });

  it('跨年的周按周一到周日计算，不因年份翻页断开', () => {
    const result = assess(
      '2027-01-02',
      [commit({ id: 'this', date: '2026-12-30' }), commit({ id: 'last', date: '2026-12-27' })],
      [branch()],
    );

    expect(result.weekStart).toBe('2026-12-28');
    expect(result.streakWeeks).toBe(2);
  });

  it('周日至周一的边界按本地日期串判断', () => {
    expect(weekDayOf('2026-11-22')).toBe(7);
    expect(weekDayOf('2026-11-23')).toBe(1);
    expect(weekStartOf('2026-11-22')).toBe('2026-11-16');
    expect(weekStartOf('2027-01-01')).toBe('2026-12-28');
  });

  it('只收集周一至今天的有效提交，未来日期不计', () => {
    const result = collectWeekCommits(
      [
        commit({ id: 'before', date: '2026-11-15' }),
        commit({ id: 'mon', date: '2026-11-16' }),
        commit({ id: 'future', date: '2026-11-22' }),
        commit({ id: 'voided', date: '2026-11-21', voidedAt: 1 }),
      ],
      '2026-11-21',
    );

    expect(result.map((row) => row.id)).toEqual(['mon']);
  });
});
