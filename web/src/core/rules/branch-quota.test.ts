import { describe, expect, it } from 'vitest';
import {
  assessCreateQuota,
  BRANCH_TREE_LIMIT,
  countActiveBranches,
  countActiveChildren,
  isCountedBranch,
  type QuotaNode,
} from './branch-quota';

function node(over: Partial<QuotaNode> & { parentId: string | null }): QuotaNode {
  return {
    depth: 1,
    archivedAt: null,
    deletedAt: null,
    ...over,
  };
}

describe('countActiveChildren（名额口径）', () => {
  it('已归档与已删除不计名额', () => {
    const nodes: QuotaNode[] = [
      node({ parentId: 'root' }),
      node({ parentId: 'root', archivedAt: 1 }),
      node({ parentId: 'root', deletedAt: 1 }),
    ];
    expect(countActiveChildren('root', nodes)).toBe(1);
  });

  it('已合并 / 已放下仍在默认树，照常计入', () => {
    const nodes: QuotaNode[] = [
      node({ parentId: 'root' }),
      node({ parentId: 'root' }),
      node({ parentId: 'root' }),
    ];
    // status 不在计数输入里：只要未归档未删除就算，合并与放下不改变 archivedAt。
    expect(countActiveChildren('root', nodes)).toBe(3);
  });

  it('根不计入整树活跃数', () => {
    const nodes: QuotaNode[] = [node({ parentId: null, depth: 0 }), node({ parentId: 'root' })];
    expect(isCountedBranch(nodes[0])).toBe(false);
    expect(countActiveBranches(nodes)).toBe(1);
  });
});

describe('assessCreateQuota', () => {
  it('根下第 8 条被拒，保留 7 / 7', () => {
    const nodes = Array.from({ length: 7 }, () => node({ parentId: 'root', depth: 1 }));
    expect(assessCreateQuota('root', 0, nodes)).toMatchObject({
      allowed: false,
      reason: 'parent-full',
      used: 7,
      limit: 7,
      remaining: 0,
    });
  });

  it('L2 上限 9、L3 上限 20', () => {
    const nine = Array.from({ length: 9 }, () => node({ parentId: 'p2', depth: 2 }));
    const twenty = Array.from({ length: 20 }, () => node({ parentId: 'p3', depth: 3 }));
    expect(assessCreateQuota('p2', 1, nine)).toMatchObject({ allowed: false, limit: 9 });
    expect(assessCreateQuota('p3', 2, twenty)).toMatchObject({ allowed: false, limit: 20 });
  });

  it('整树 200 条时任何新建都被拒', () => {
    const nodes = Array.from({ length: BRANCH_TREE_LIMIT }, (_, index) =>
      node({ parentId: `p${index}`, depth: (index % 3) + 1 }),
    );
    expect(assessCreateQuota('root', 0, nodes)).toMatchObject({
      allowed: false,
      reason: 'tree-full',
      treeUsed: 200,
    });
  });

  it('L3 下不允许再建子分支', () => {
    expect(assessCreateQuota('p3', 3, [])).toMatchObject({
      allowed: false,
      reason: 'depth-limit',
    });
  });

  it('有余额时返回剩余数', () => {
    const nodes = [node({ parentId: 'root', depth: 1 })];
    expect(assessCreateQuota('root', 0, nodes)).toMatchObject({
      allowed: true,
      used: 1,
      limit: 7,
      remaining: 6,
    });
  });
});
