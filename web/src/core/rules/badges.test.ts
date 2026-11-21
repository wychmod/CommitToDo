import { describe, expect, it } from 'vitest';
import {
  assessBadges,
  type BadgeBranchRow,
  type BadgeCommitRow,
  type BadgeMilestoneRow,
} from './badges';

const AT = Date.UTC(2026, 10, 21, 9, 0);

function branch(over: Partial<BadgeBranchRow> & Pick<BadgeBranchRow, 'id'>): BadgeBranchRow {
  return {
    parentId: 'root',
    depth: 1,
    title: over.id,
    status: 'active',
    createdAt: AT,
    finishedAt: null,
    finishedIntoId: null,
    deletedAt: null,
    ...over,
  };
}

function commit(over: Partial<BadgeCommitRow> & Pick<BadgeCommitRow, 'id'>): BadgeCommitRow {
  return {
    branchId: 'root',
    summary: over.id,
    at: AT,
    voidedAt: null,
    deletedAt: null,
    ...over,
  };
}

function milestone(
  over: Partial<BadgeMilestoneRow> & Pick<BadgeMilestoneRow, 'id'>,
): BadgeMilestoneRow {
  return {
    branchId: 'root',
    title: over.id,
    achievedAt: AT,
    datePrecision: 'day',
    deletedAt: null,
    ...over,
  };
}

describe('assessBadges（M11 OP-01 / OP-02）', () => {
  it('空数据没有候选', () => {
    expect(assessBadges({ branches: [], commits: [], milestones: [] })).toEqual([]);
  });

  it('四枚徽章各取最早的触发事实', () => {
    const candidates = assessBadges({
      branches: [
        branch({ id: 'b-late', depth: 2, createdAt: AT + 1_000 }),
        branch({ id: 'b-early', depth: 2, createdAt: AT - 1_000 }),
        branch({
          id: 'merged',
          depth: 1,
          status: 'merged',
          finishedAt: AT - 200,
          finishedIntoId: 'root',
        }),
      ],
      commits: [
        commit({ id: 'c-late', at: AT }),
        commit({ id: 'c-early', at: AT - 2_000, summary: '第一条' }),
      ],
      milestones: [
        milestone({ id: 'm-late', achievedAt: AT }),
        milestone({ id: 'm-early', achievedAt: AT - 3_000 }),
      ],
    });

    expect(candidates.map((item) => item.catalogId)).toEqual([
      'first-commit',
      'first-branch',
      'first-milestone',
      'first-merge',
    ]);
    expect(candidates[0]).toMatchObject({
      sourceEntityId: 'c-early',
      category: 'time',
      snapshot: { commitId: 'c-early', summary: '第一条', at: AT - 2_000 },
    });
    expect(candidates[1]).toMatchObject({
      sourceEntityId: 'b-early',
      category: 'structure',
      snapshot: { branchId: 'b-early', createdAt: AT - 1_000 },
    });
    expect(candidates[2]).toMatchObject({
      sourceEntityId: 'm-early',
      category: 'milestone',
      snapshot: { milestoneId: 'm-early', achievedAt: AT - 3_000 },
    });
    expect(candidates[3]).toMatchObject({
      sourceEntityId: 'merged',
      category: 'structure',
      snapshot: { branchId: 'merged', finishedIntoId: 'root', finishedAt: AT - 200 },
    });
  });

  it('根分支与已删除的分支不算第一道岔与汇流', () => {
    const candidates = assessBadges({
      branches: [
        branch({ id: 'root', parentId: null, depth: 0, status: 'merged', finishedAt: AT }),
        branch({ id: 'gone', depth: 2, deletedAt: AT }),
        branch({ id: 'deep', depth: 3 }),
        branch({ id: 'merged-gone', depth: 1, status: 'merged', deletedAt: AT }),
      ],
      commits: [],
      milestones: [],
    });

    expect(candidates).toEqual([]);
  });

  it('已撤销与已删除的提交都不算起笔', () => {
    const candidates = assessBadges({
      branches: [],
      commits: [
        commit({ id: 'voided', at: AT - 2_000, voidedAt: AT }),
        commit({ id: 'deleted', at: AT - 3_000, deletedAt: AT }),
      ],
      milestones: [],
    });

    expect(candidates).toEqual([]);
  });

  it('同一时刻的触发事实按 id 稳定挑选', () => {
    const candidates = assessBadges({
      branches: [],
      commits: [commit({ id: 'b' }), commit({ id: 'a' })],
      milestones: [],
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0].sourceEntityId).toBe('a');
  });

  it('已删除的里程碑不算立碑', () => {
    const candidates = assessBadges({
      branches: [],
      commits: [],
      milestones: [milestone({ id: 'gone', deletedAt: AT })],
    });

    expect(candidates).toEqual([]);
  });
});
