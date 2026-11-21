import { describe, expect, it } from 'vitest';
import {
  buildSampleTree,
  isValidSampleTree,
  SAMPLE_ID_PREFIX,
  SAMPLE_OWNER_ID,
  sampleTreeProblems,
  type SampleBranchRow,
  type SampleTree,
} from './sample-tree';

const ANCHOR = Date.UTC(2026, 10, 21, 9, 0);
const TZ = 480;
const TREE = buildSampleTree(ANCHOR, TZ);

function clone(tree: SampleTree): SampleTree {
  return {
    branches: tree.branches.map((row) => ({ ...row })),
    commits: tree.commits.map((row) => ({ ...row })),
    milestones: tree.milestones.map((row) => ({ ...row })),
  };
}

describe('示例树规格（M12 OP-05）', () => {
  it('分支数在 3–4 之间且同时覆盖 L1/L2/L3', () => {
    expect(TREE.branches.length).toBeGreaterThanOrEqual(3);
    expect(TREE.branches.length).toBeLessThanOrEqual(4);
    expect(new Set(TREE.branches.map((branch) => branch.depth))).toEqual(new Set([1, 2, 3]));
  });

  it('提交数在 8–12 之间，里程碑恰为 2 个', () => {
    expect(TREE.commits.length).toBeGreaterThanOrEqual(8);
    expect(TREE.commits.length).toBeLessThanOrEqual(12);
    expect(TREE.milestones).toHaveLength(2);
  });

  it('全部示例记录带独立命名空间标识', () => {
    const records = [...TREE.branches, ...TREE.commits, ...TREE.milestones];

    expect(records.every((row) => row.ownerId === SAMPLE_OWNER_ID)).toBe(true);
    expect(records.every((row) => row.id.startsWith(SAMPLE_ID_PREFIX))).toBe(true);
    expect(new Set(records.map((row) => row.id)).size).toBe(records.length);
  });

  it('分支父子关系与 path、depth 一致', () => {
    const byId = new Map(TREE.branches.map((branch) => [branch.id, branch]));

    for (const branch of TREE.branches) {
      if (!branch.parentId) {
        expect(branch.depth).toBe(1);
        expect(branch.path).toBe(branch.id);
        continue;
      }
      const parent = byId.get(branch.parentId);
      expect(parent).toBeDefined();
      expect(branch.depth).toBe((parent?.depth ?? 0) + 1);
      expect(branch.path).toBe(`${parent?.path ?? ''}/${branch.id}`);
    }
  });

  it('提交与里程碑都挂在这棵树的分支上', () => {
    const ids = new Set(TREE.branches.map((branch) => branch.id));

    expect(TREE.commits.every((commit) => ids.has(commit.branchId))).toBe(true);
    expect(TREE.milestones.every((milestone) => ids.has(milestone.branchId))).toBe(true);
  });

  it('同一锚点重复生成得到同一组 id', () => {
    const again = buildSampleTree(ANCHOR, TZ);

    expect(again.branches.map((branch) => branch.id)).toEqual(
      TREE.branches.map((branch) => branch.id),
    );
    expect(again.commits.map((commit) => commit.id)).toEqual(
      TREE.commits.map((commit) => commit.id),
    );
  });

  it('只返回三段只读行，不带完成、编辑、收尾或删除等写操作', () => {
    expect(Object.keys(TREE).sort()).toEqual(['branches', 'commits', 'milestones']);
    for (const value of Object.values(TREE)) {
      expect(Array.isArray(value)).toBe(true);
    }
  });

  it('默认示例通过规格自检', () => {
    expect(sampleTreeProblems(TREE)).toEqual([]);
    expect(isValidSampleTree(TREE)).toBe(true);
  });
});

describe('sampleTreeProblems（M12 §8.2 边界）', () => {
  it('缺一层时报告 missing-depth', () => {
    const tree = clone(TREE);
    tree.branches = tree.branches.filter((branch) => branch.depth !== 3);

    expect(sampleTreeProblems(tree)).toContain('missing-depth-3');
  });

  it('里程碑数为 0 时不合法', () => {
    const tree = clone(TREE);
    tree.milestones = [];

    expect(sampleTreeProblems(tree)).toContain('milestone-count');
    expect(isValidSampleTree(tree)).toBe(false);
  });

  it('分支少于 3 或多于 4 不合法', () => {
    const fewer = clone(TREE);
    fewer.branches = fewer.branches.filter((branch) => branch.depth === 1);
    expect(sampleTreeProblems(fewer)).toContain('branch-count');

    const more = clone(TREE);
    const extra: SampleBranchRow = { ...more.branches[0]!, id: `${SAMPLE_ID_PREFIX}extra` };
    more.branches.push(extra);
    expect(sampleTreeProblems(more)).toContain('branch-count');
  });

  it('提交数越界不合法', () => {
    const fewer = clone(TREE);
    fewer.commits = fewer.commits.slice(0, 7);
    expect(sampleTreeProblems(fewer)).toContain('commit-count');

    const more = clone(TREE);
    more.commits = [...more.commits, ...more.commits.map((row) => ({ ...row, id: `${row.id}-x` }))];
    expect(sampleTreeProblems(more)).toContain('commit-count');
  });

  it('命名空间标识与真实记录冲突时不合法', () => {
    const tree = clone(TREE);
    tree.branches[0]!.ownerId = 'local';

    expect(sampleTreeProblems(tree)).toContain('namespace');
  });

  it('id 没有示例前缀时不合法', () => {
    const tree = clone(TREE);
    tree.commits[0]!.id = 'real-commit';

    expect(sampleTreeProblems(tree)).toContain('namespace');
  });
});
