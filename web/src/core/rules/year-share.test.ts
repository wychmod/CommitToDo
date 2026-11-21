import { describe, expect, it } from 'vitest';
import type { YearDistributionBranch } from './year-distribution';
import { buildYearShareModel, shareBranchTitle, type YearShareCommit } from './year-share';

const TZ = 480;

function branch(
  over: Partial<YearDistributionBranch> & Pick<YearDistributionBranch, 'id'>,
): YearDistributionBranch {
  return {
    parentId: 'root',
    depth: 1,
    title: over.id,
    color: 'sky',
    status: 'active',
    createdAt: 0,
    finishedAt: null,
    deletedAt: null,
    archivedAt: null,
    taskDone: 0,
    taskTotal: 0,
    ...over,
  };
}

function commit(over: Partial<YearShareCommit> & Pick<YearShareCommit, 'id'>): YearShareCommit {
  return {
    branchId: 'a',
    date: '2026-05-01',
    at: 1,
    voidedAt: null,
    deletedAt: null,
    ...over,
  };
}

const root = branch({ id: 'root', parentId: null, depth: 0, title: '我' });
const a = branch({ id: 'a', title: '甲' });
const child = branch({ id: 'child', parentId: 'a', depth: 2, title: '子分支' });
const branches = [root, a, child];

const share = (commits: YearShareCommit[], rows = branches) =>
  buildYearShareModel({
    year: 2026,
    commits,
    branches: rows,
    todayDate: '2026-11-21',
    tzOffsetMinutes: TZ,
  });

describe('年度分享图模型（R11）', () => {
  it('泳道按一级分支分组，根分支提交单独一条', () => {
    const result = share([
      commit({ id: '1', branchId: 'child', at: 2 }),
      commit({ id: '2', branchId: 'a', at: 1 }),
      commit({ id: '3', branchId: 'root', at: 3 }),
    ]);
    expect(result.total).toBe(3);
    expect(result.lanes).toHaveLength(2);
    expect(
      result.lanes.find((lane) => lane.branchId === 'a')?.nodes.map((node) => node.id),
    ).toEqual(['2', '1']);
    expect(result.lanes.find((lane) => lane.branchId === null)?.commits).toBe(1);
  });

  it('撤销最后一条后不可用，撤销部分后数字与节点同步减少', () => {
    const one = commit({ id: '1' });
    const two = commit({ id: '2', date: '2026-06-01', at: 2 });
    const reduced = share([one, { ...two, voidedAt: 3 }]);
    expect(reduced.total).toBe(1);
    expect(reduced.lanes[0]?.nodes.map((node) => node.id)).toEqual(['1']);
    expect(share([{ ...one, voidedAt: 3 }]).available).toBe(false);
    expect(share([{ ...one, voidedAt: 3 }]).lanes).toEqual([]);
  });

  it('0 条有效提交或只有里程碑时不可用', () => {
    expect(share([])).toMatchObject({ available: false, total: 0, lanes: [] });
    expect(share([], [root, a, { ...child, createdAt: 100 }]).total).toBe(0);
  });

  it('空白或包含换行的分支名跳过，其余名称去除首尾空白', () => {
    expect(shareBranchTitle('  ')).toBeNull();
    expect(shareBranchTitle('甲\n乙')).toBeNull();
    expect(shareBranchTitle('  甲乙  ')).toBe('甲乙');
    const result = share([commit({ id: '1' })], [root, { ...a, title: '\n' }, child]);
    expect(result.lanes[0]?.title).toBeNull();
  });
});
