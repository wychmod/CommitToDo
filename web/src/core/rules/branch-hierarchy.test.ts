import { describe, expect, it } from 'vitest';
import { assessMove, canCreateChild, isDescendantPath, MAX_BRANCH_DEPTH } from './branch-hierarchy';

const root = { id: 'root', path: '/', depth: 0 };
const l1 = { id: 'a', path: '/a/', depth: 1 };
const l2 = { id: 'b', path: '/a/b/', depth: 2 };
const l3 = { id: 'c', path: '/a/b/c/', depth: 3 };
const otherL1 = { id: 'x', path: '/x/', depth: 1 };
const otherL2 = { id: 'y', path: '/x/y/', depth: 2 };

describe('canCreateChild（R16）', () => {
  it('最多 3 层：L0–L2 下可以新建，L3 下不行', () => {
    expect(canCreateChild(0)).toBe(true);
    expect(canCreateChild(1)).toBe(true);
    expect(canCreateChild(2)).toBe(true);
    expect(canCreateChild(3)).toBe(false);
    expect(canCreateChild(4)).toBe(false);
  });

  it('上限常量与规则一致', () => {
    expect(MAX_BRANCH_DEPTH).toBe(3);
  });
});

describe('isDescendantPath（路径前缀）', () => {
  it('/a/b/ 是 /a/b/c/ 的祖先，不是 /a/bc/ 的祖先', () => {
    expect(isDescendantPath('/a/b/c/', '/a/b/')).toBe(true);
    expect(isDescendantPath('/a/bc/', '/a/b/')).toBe(false);
    expect(isDescendantPath('/a/b/', '/a/b/')).toBe(false);
  });
});

describe('assessMove（B05）', () => {
  it('目标是自身、直接子、孙代都拒绝', () => {
    const subject = { ...l1, subtreeMaxDepth: 3 };
    expect(assessMove(l1, 3, l1).reason).toBe('self');
    expect(assessMove(l1, 3, l2).reason).toBe('descendant');
    expect(assessMove(l1, 3, l3).reason).toBe('descendant');
    expect(subject.subtreeMaxDepth).toBe(3);
  });

  it('子树本身已 3 层：移到根下可以，移到 L2 下超深', () => {
    expect(assessMove(l1, 3, root)).toEqual({
      allowed: true,
      reason: null,
      resultingMaxDepth: 3,
    });
    expect(assessMove(l1, 3, otherL2)).toEqual({
      allowed: false,
      reason: 'too-deep',
      resultingMaxDepth: 5,
    });
  });

  it('L2 带着 L3 子分支移到另一条 L1 下仍合法', () => {
    expect(assessMove(l2, 3, otherL1)).toEqual({
      allowed: true,
      reason: null,
      resultingMaxDepth: 3,
    });
  });

  it('根不可被移动', () => {
    expect(assessMove(root, 3, otherL1).reason).toBe('root');
  });

  it('同父下移动（无层级变化）合法', () => {
    expect(assessMove(l2, 2, l1).allowed).toBe(true);
  });
});
