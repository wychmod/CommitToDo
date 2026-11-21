import { describe, expect, it } from 'vitest';
import {
  BRANCH_COLORS,
  branchShadeForDepth,
  inheritedBranchColor,
  isBranchColor,
  normalizeBranchColor,
} from './branch-color';

describe('branchShadeForDepth（K-03）', () => {
  it('L1 最浅、L2 中档、L3 最深', () => {
    expect(branchShadeForDepth(1)).toBe(1);
    expect(branchShadeForDepth(2)).toBe(2);
    expect(branchShadeForDepth(3)).toBe(3);
  });

  it('根与更深层级被夹到合法档位', () => {
    expect(branchShadeForDepth(0)).toBe(1);
    expect(branchShadeForDepth(9)).toBe(3);
  });
});

describe('色相继承（K-03）', () => {
  it('7 个预设各建一个子分支都继承父色相', () => {
    for (const color of BRANCH_COLORS) {
      expect(inheritedBranchColor(color)).toBe(color);
    }
  });

  it('从 L1 移到 L2 只变深浅，不变色相', () => {
    const color = inheritedBranchColor('coral');
    const before = { color, shade: branchShadeForDepth(1) };
    const after = { color: inheritedBranchColor(color), shade: branchShadeForDepth(2) };
    expect(after.color).toBe(before.color);
    expect(after.shade).not.toBe(before.shade);
  });

  it('只有 7 个预设是合法色相', () => {
    expect(BRANCH_COLORS).toHaveLength(7);
    expect(isBranchColor('coral')).toBe(true);
    expect(isBranchColor('blue')).toBe(false);
    expect(isBranchColor(undefined)).toBe(false);
  });

  it('缺色与非法色回落默认色', () => {
    expect(normalizeBranchColor(undefined)).toBe('sky');
    expect(normalizeBranchColor('')).toBe('sky');
    expect(normalizeBranchColor('Coral')).toBe('sky');
  });
});
