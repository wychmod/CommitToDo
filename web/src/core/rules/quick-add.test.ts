import { describe, expect, it } from 'vitest';
import { parseQuickAdd, resolveBranchQuery, type BranchLabel } from './quick-add';

const TODAY = '2026-11-21';

const branches: BranchLabel[] = [
  { id: 'root', title: '我', parentId: null },
  { id: 'work', title: '工作', parentId: 'root' },
  { id: 'design', title: '产品设计', parentId: 'work' },
  { id: 'life', title: '生活', parentId: 'root' },
];

describe('parseQuickAdd（B-01 最小识别集合）', () => {
  it('识别「今天」并去掉日期词', () => {
    expect(parseQuickAdd('今天交周报', TODAY)).toMatchObject({
      title: '交周报',
      dueDate: TODAY,
      dateToken: '今天',
    });
  });

  it('识别「明天」与「YYYY-MM-DD」', () => {
    expect(parseQuickAdd('明天交周报', TODAY)).toMatchObject({
      title: '交周报',
      dueDate: '2026-11-22',
    });
    expect(parseQuickAdd('2026-12-01 交周报', TODAY)).toMatchObject({
      title: '交周报',
      dueDate: '2026-12-01',
    });
  });

  it('无法识别的内容原样保留、日期为空', () => {
    expect(parseQuickAdd('下周一交周报', TODAY)).toMatchObject({
      title: '下周一交周报',
      dueDate: null,
      dateToken: null,
    });
  });

  it('识别 #分支 并从标题中移除', () => {
    expect(parseQuickAdd('复查焦点明天 #产品设计', TODAY)).toMatchObject({
      title: '复查焦点',
      dueDate: '2026-11-22',
      branchQuery: '产品设计',
    });
  });

  it('只有日期词时标题为空，交给调用方拦截', () => {
    expect(parseQuickAdd('明天', TODAY).title).toBe('');
  });
});

describe('resolveBranchQuery（分支匹配）', () => {
  it('完整路径优先，其次同名末级', () => {
    expect(resolveBranchQuery(branches, '工作/产品设计')?.id).toBe('design');
    expect(resolveBranchQuery(branches, '产品设计')?.id).toBe('design');
    expect(resolveBranchQuery(branches, '不存在')).toBeNull();
  });
});
