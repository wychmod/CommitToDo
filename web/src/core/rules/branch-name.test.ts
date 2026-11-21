import { describe, expect, it } from 'vitest';
import { normalizeBranchTitle, validateBranchTitle } from './branch-name';

const siblings = [
  { id: 'a', title: '工作' },
  { id: 'b', title: '生活' },
];

describe('normalizeBranchTitle', () => {
  it('去掉首尾空白但保留中间空格', () => {
    expect(normalizeBranchTitle('  工作  ')).toBe('工作');
    expect(normalizeBranchTitle('产品 设计')).toBe('产品 设计');
  });
});

describe('validateBranchTitle', () => {
  it('仅空白字符视为空名称', () => {
    expect(validateBranchTitle({ title: '   ', siblings })).toMatchObject({
      ok: false,
      reason: 'empty',
    });
  });

  it('同级重名被拒', () => {
    expect(validateBranchTitle({ title: '工作', siblings })).toMatchObject({
      ok: false,
      reason: 'duplicate',
    });
    expect(validateBranchTitle({ title: ' 生活 ', siblings })).toMatchObject({
      ok: false,
      reason: 'duplicate',
    });
  });

  it('重命名排除自身，改成原名不算重名', () => {
    expect(validateBranchTitle({ title: '工作', siblings, selfId: 'a' }).ok).toBe(true);
  });

  it('重命名撞到其他同级仍被拒', () => {
    expect(validateBranchTitle({ title: '生活', siblings, selfId: 'a' }).reason).toBe('duplicate');
  });

  it('空同级表时只校验名称是否为空', () => {
    expect(validateBranchTitle({ title: '新方向', siblings: [] })).toEqual({
      ok: true,
      reason: null,
      title: '新方向',
    });
  });
});
