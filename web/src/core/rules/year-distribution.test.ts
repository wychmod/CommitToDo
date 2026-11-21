import { describe, expect, it } from 'vitest';
import { buildYearDistribution, type YearDistributionBranch } from './year-distribution';
import type { YearCommitRecord } from './year-metrics';

/**
 * 12 个月分布、一级分支占比与 Top 分支（PRD V1-02 §8.2）。
 *
 * 最值钱的两条：子分支提交必须归并到一级祖先；未到月份与无提交月份必须可区分。
 */

const TODAY = '2026-11-21';

function branchRow(
  over: Partial<YearDistributionBranch> & Pick<YearDistributionBranch, 'id' | 'parentId' | 'depth'>,
): YearDistributionBranch {
  return {
    title: over.id,
    color: 'sky',
    status: 'active',
    archivedAt: null,
    createdAt: Date.UTC(2026, 0, 1),
    finishedAt: null,
    deletedAt: null,
    taskDone: 0,
    taskTotal: 0,
    ...over,
  };
}

function commitRow(
  over: Partial<YearCommitRecord> & Pick<YearCommitRecord, 'branchId' | 'date'>,
): YearCommitRecord {
  return { voidedAt: null, deletedAt: null, ...over };
}

const root = branchRow({ id: 'root', parentId: null, depth: 0, title: '我', color: 'sky' });
const levelOne = branchRow({
  id: 'l1',
  parentId: 'root',
  depth: 1,
  title: '写作',
  color: 'coral',
  taskDone: 3,
  taskTotal: 8,
});
const levelTwo = branchRow({ id: 'l2', parentId: 'l1', depth: 2, title: '短篇' });

describe('年轮 12 个月分布', () => {
  it('子分支提交归并到一级祖先，同一提交只算一次', () => {
    const distribution = buildYearDistribution({
      year: 2026,
      todayDate: TODAY,
      commits: [
        commitRow({ branchId: 'l2', date: '2026-03-01' }),
        commitRow({ branchId: 'l2', date: '2026-03-20' }),
        commitRow({ branchId: 'l1', date: '2026-01-05' }),
        commitRow({ branchId: 'root', date: '2026-01-06' }),
      ],
      branches: [root, levelOne, levelTwo],
    });

    expect(distribution.total).toBe(4);
    expect(distribution.months[0]).toEqual({ month: 1, count: 2 });
    expect(distribution.months[2]).toEqual({ month: 3, count: 2 });

    const share = distribution.shares.find((row) => row.branchId === 'l1');
    expect(share?.commits).toBe(3);
    expect(distribution.shares.find((row) => row.branchId === null)?.commits).toBe(1);
  });

  it('当前年未到月份为空位，已到但无提交的月份为 0 柱', () => {
    const distribution = buildYearDistribution({
      year: 2026,
      todayDate: TODAY,
      commits: [],
      branches: [root, levelOne],
    });
    expect(distribution.months).toHaveLength(12);
    expect(distribution.months[10]).toEqual({ month: 11, count: 0 });
    expect(distribution.months[11]).toEqual({ month: 12, count: null });
    expect(distribution.months[0]).toEqual({ month: 1, count: 0 });
  });

  it('往年 12 个月全部已到，没有提交的月份是 0 而不是空位', () => {
    const distribution = buildYearDistribution({
      year: 2025,
      todayDate: TODAY,
      commits: [commitRow({ branchId: 'l1', date: '2025-07-01' })],
      branches: [root, levelOne],
    });
    expect(distribution.months.every((bucket) => bucket.count !== null)).toBe(true);
    expect(distribution.months[6]).toEqual({ month: 7, count: 1 });
    expect(distribution.months[11]).toEqual({ month: 12, count: 0 });
  });

  it('撤销的提交不计入分布', () => {
    const distribution = buildYearDistribution({
      year: 2026,
      todayDate: TODAY,
      commits: [
        commitRow({ branchId: 'l1', date: '2026-02-01', voidedAt: Date.UTC(2026, 1, 2) }),
        commitRow({ branchId: 'l1', date: '2026-02-02' }),
      ],
      branches: [root, levelOne],
    });
    expect(distribution.total).toBe(1);
    expect(distribution.months[1]).toEqual({ month: 2, count: 1 });
  });
});

describe('年轮分支占比与 Top 分支', () => {
  it('占比之和为 100%，含「我」一行时也成立', () => {
    const distribution = buildYearDistribution({
      year: 2026,
      todayDate: TODAY,
      commits: [
        commitRow({ branchId: 'l1', date: '2026-01-01' }),
        commitRow({ branchId: 'l1', date: '2026-01-02' }),
        commitRow({ branchId: 'l1', date: '2026-01-03' }),
        commitRow({ branchId: 'root', date: '2026-01-04' }),
        commitRow({ branchId: 'l1', date: '2026-01-05' }),
        commitRow({ branchId: 'root', date: '2026-01-06' }),
        commitRow({ branchId: 'l1', date: '2026-01-07' }),
      ],
      branches: [root, levelOne],
    });

    const ratioSum = distribution.shares.reduce((sum, row) => sum + row.ratio, 0);
    expect(Math.abs(ratioSum - 1)).toBeLessThan(1e-9);
    const percentSum = distribution.shares.reduce(
      (sum, row) => sum + Math.round(row.ratio * 100),
      0,
    );
    expect(percentSum).toBeGreaterThanOrEqual(99);
    expect(percentSum).toBeLessThanOrEqual(101);
  });

  it('根分支提交归「我」一行，且不进入 Top 分支', () => {
    const distribution = buildYearDistribution({
      year: 2026,
      todayDate: TODAY,
      commits: [commitRow({ branchId: 'root', date: '2026-05-01' })],
      branches: [root, levelOne],
    });
    expect(distribution.shares).toHaveLength(1);
    expect(distribution.shares[0]).toMatchObject({
      branchId: null,
      title: '我',
      color: null,
      commits: 1,
    });
    expect(distribution.top).toEqual([]);
  });

  it('Top 按提交数降序最多 5 条，并列时创建时间早的在前', () => {
    const branches: YearDistributionBranch[] = [root];
    const commits: YearCommitRecord[] = [];
    for (let index = 0; index < 7; index += 1) {
      branches.push(
        branchRow({
          id: `b${index}`,
          parentId: 'root',
          depth: 1,
          title: `分支${index}`,
          createdAt: Date.UTC(2026, 0, index + 1),
        }),
      );
      commits.push(commitRow({ branchId: `b${index}`, date: '2026-06-01' }));
    }
    // 让 b6 提交更多，稳居第一；其余并列按创建时间升序。
    commits.push(commitRow({ branchId: 'b6', date: '2026-06-02' }));

    const distribution = buildYearDistribution({
      year: 2026,
      todayDate: TODAY,
      commits,
      branches,
    });

    expect(distribution.top).toHaveLength(5);
    expect(distribution.top[0]?.branchId).toBe('b6');
    expect(distribution.top.slice(1).map((row) => row.branchId)).toEqual(['b0', 'b1', 'b2', 'b3']);
  });

  it('行内进度直接读分支当前 taskDone / taskTotal，不按年过滤', () => {
    const distribution = buildYearDistribution({
      year: 2026,
      todayDate: TODAY,
      commits: [commitRow({ branchId: 'l1', date: '2026-01-01' })],
      branches: [root, levelOne],
    });
    expect(distribution.shares[0]).toMatchObject({
      branchId: 'l1',
      taskDone: 3,
      taskTotal: 8,
      archived: false,
      color: 'coral',
    });
  });

  it('已归档一级分支仍出现在分布中并带上归档标记', () => {
    const archived = branchRow({
      id: 'old',
      parentId: 'root',
      depth: 1,
      title: '旧线',
      archivedAt: Date.UTC(2026, 8, 1),
    });
    const distribution = buildYearDistribution({
      year: 2026,
      todayDate: TODAY,
      commits: [commitRow({ branchId: 'old', date: '2026-01-01' })],
      branches: [root, archived],
    });
    expect(distribution.shares[0]).toMatchObject({ branchId: 'old', archived: true });
  });

  it('没有提交时分布为空，占比不会出现 NaN', () => {
    const distribution = buildYearDistribution({
      year: 2026,
      todayDate: TODAY,
      commits: [],
      branches: [root, levelOne],
    });
    expect(distribution.total).toBe(0);
    expect(distribution.shares).toEqual([]);
    expect(distribution.top).toEqual([]);
    expect(distribution.months[0]).toEqual({ month: 1, count: 0 });
  });
});
