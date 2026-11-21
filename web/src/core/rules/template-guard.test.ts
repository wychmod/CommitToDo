import { describe, expect, it } from 'vitest';
import {
  assessTemplateWithdraw,
  isBlankWorkspace,
  templateSubtree,
  type GuardRows,
} from './template-guard';

const root = {
  id: 'root',
  parentId: null,
  depth: 0,
  deletedAt: null,
};
const primary = { id: 'p1', parentId: 'root', depth: 1, deletedAt: null };
const secondary = { id: 's1', parentId: 'p1', depth: 2, deletedAt: null };

function rows(overrides: Partial<GuardRows> = {}): GuardRows {
  return {
    branches: [root, primary, secondary],
    tasks: [],
    commits: [],
    milestones: [],
    ...overrides,
  };
}

describe('空树判定', () => {
  it('只有根分支且没有待办、提交、里程碑时为空树', () => {
    expect(isBlankWorkspace(rows({ branches: [root] }))).toBe(true);
  });

  it('有待办、提交、里程碑或有非根分支时都不是空树', () => {
    expect(
      isBlankWorkspace(
        rows({ branches: [root], tasks: [{ id: 't', branchId: 'root', deletedAt: null }] }),
      ),
    ).toBe(false);
    expect(
      isBlankWorkspace(
        rows({
          branches: [root],
          commits: [{ branchId: 'root', voidedAt: null, deletedAt: null }],
        }),
      ),
    ).toBe(false);
    expect(
      isBlankWorkspace(
        rows({ branches: [root], milestones: [{ branchId: 'root', deletedAt: null }] }),
      ),
    ).toBe(false);
    expect(isBlankWorkspace(rows())).toBe(false);
  });

  it('已删除的行不算真实数据', () => {
    expect(
      isBlankWorkspace(
        rows({
          branches: [root],
          tasks: [{ id: 't', branchId: 'root', deletedAt: 1 }],
          commits: [{ branchId: 'root', voidedAt: null, deletedAt: 1 }],
          milestones: [{ branchId: 'root', deletedAt: 1 }],
        }),
      ),
    ).toBe(true);
  });
});

describe('模板子树', () => {
  it('收集根分支及其全部后代', () => {
    expect(templateSubtree('p1', rows()).sort()).toEqual(['p1', 's1']);
  });
});

describe('可撤回判定', () => {
  it('子树内没有有效提交与里程碑时可撤回', () => {
    const result = assessTemplateWithdraw(
      'p1',
      rows({ tasks: [{ id: 't1', branchId: 's1', deletedAt: null }] }),
    );
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('none');
    expect(result.branchIds.sort()).toEqual(['p1', 's1']);
    expect(result.taskIds).toEqual(['t1']);
  });

  it('有有效提交时不可撤回', () => {
    const result = assessTemplateWithdraw(
      'p1',
      rows({ commits: [{ branchId: 's1', voidedAt: null, deletedAt: null }] }),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('commits');
  });

  it('只有作废提交时可以撤回', () => {
    const result = assessTemplateWithdraw(
      'p1',
      rows({ commits: [{ branchId: 's1', voidedAt: 1, deletedAt: null }] }),
    );
    expect(result.allowed).toBe(true);
  });

  it('有里程碑时不可撤回', () => {
    const result = assessTemplateWithdraw(
      'p1',
      rows({ milestones: [{ branchId: 's1', deletedAt: null }] }),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('milestones');
  });

  it('子树外的新增内容不影响撤回范围', () => {
    const other = { id: 'p2', parentId: 'root', depth: 1, deletedAt: null };
    const result = assessTemplateWithdraw(
      'p1',
      rows({
        branches: [root, primary, secondary, other],
        tasks: [{ id: 't2', branchId: 'p2', deletedAt: null }],
      }),
    );
    expect(result.allowed).toBe(true);
    expect(result.branchIds).not.toContain('p2');
    expect(result.taskIds).toEqual([]);
  });

  it('找不到模板根或根不是一级分支时不可撤回', () => {
    expect(assessTemplateWithdraw('missing', rows()).reason).toBe('missing');
    expect(assessTemplateWithdraw('root', rows()).reason).toBe('missing');
  });
});
