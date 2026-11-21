import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HISTORY_FILTER,
  filterBranchIds,
  laneForBranch,
  normalizeHistoryFilter,
  resolveDirectTarget,
  withManualFilter,
  type FilterBranch,
  type HistoryFilter,
} from './timeline-filter';

const BRANCHES: FilterBranch[] = [
  { id: 'root', parentId: null },
  { id: 'work', parentId: 'root' },
  { id: 'design', parentId: 'work' },
  { id: 'life', parentId: 'root' },
  { id: 'health', parentId: 'life' },
  { id: 'archive', parentId: 'root' },
];

describe('分支筛选（M06 §4.3 / OP-05）', () => {
  it('选中一级分支时只含该线及其后代', () => {
    expect([...filterBranchIds(BRANCHES, 'work')!].sort()).toEqual(['design', 'work']);
    expect([...filterBranchIds(BRANCHES, 'life')!].sort()).toEqual(['health', 'life']);
  });

  it('选中根分支时含全部分支', () => {
    expect(filterBranchIds(BRANCHES, 'root')!.size).toBe(BRANCHES.length);
  });

  it('不筛选时返回 null', () => {
    expect(filterBranchIds(BRANCHES, null)).toBeNull();
  });

  it('已归档的一级分支也能被筛选命中', () => {
    expect([...filterBranchIds(BRANCHES, 'archive')!]).toEqual(['archive']);
  });
});

describe('直达定位（M06 §4.3 / OP-06）', () => {
  const saved: HistoryFilter = { range: 'thisYear', branchId: 'work' };

  it('目标被现有筛选隐藏时只产生临时标记', () => {
    const resolution = resolveDirectTarget(saved, BRANCHES, {
      branchId: 'health',
      date: '2026-11-10',
    });
    expect(resolution.temporary).toBe(true);
    expect(resolution.laneId).toBe('life');
    expect(saved).toEqual({ range: 'thisYear', branchId: 'work' });
  });

  it('目标在筛选内时不临时显示', () => {
    const resolution = resolveDirectTarget(saved, BRANCHES, {
      branchId: 'design',
      date: '2026-11-10',
    });
    expect(resolution.temporary).toBe(false);
    expect(resolution.laneId).toBe('work');
  });

  it('直达不返回改写后的已存筛选', () => {
    const resolution = resolveDirectTarget(DEFAULT_HISTORY_FILTER, BRANCHES, {
      branchId: 'life',
      date: '2026-11-10',
    });
    expect(resolution.temporary).toBe(false);
    expect(DEFAULT_HISTORY_FILTER).toEqual({ range: 'recent90', branchId: null });
  });

  it('只有用户手动改筛选才覆盖保存值', () => {
    const next = withManualFilter(saved, { branchId: 'life' });
    expect(next).toEqual({ range: 'thisYear', branchId: 'life' });
    expect(saved.branchId).toBe('work');
  });

  it('重复直达同一目标结果一致', () => {
    const target = { branchId: 'health', date: '2026-11-10' };
    expect(resolveDirectTarget(saved, BRANCHES, target)).toEqual(
      resolveDirectTarget(saved, BRANCHES, target),
    );
  });

  it('找不到目标分支时不产生高亮', () => {
    expect(
      resolveDirectTarget(saved, BRANCHES, { branchId: 'missing', date: '2026-11-10' }),
    ).toEqual({ target: null, laneId: null, temporary: false });
  });
});

describe('筛选记忆（M06 §4.3）', () => {
  it('缺失或损坏的本机状态回落默认值', () => {
    expect(normalizeHistoryFilter(null)).toEqual(DEFAULT_HISTORY_FILTER);
    expect(normalizeHistoryFilter({ range: 'bad', branchId: 3 })).toEqual({
      range: 'recent90',
      branchId: null,
    });
  });

  it('保存的范围与分支可原样读回', () => {
    expect(normalizeHistoryFilter({ range: 'thisYear', branchId: 'work' })).toEqual({
      range: 'thisYear',
      branchId: 'work',
    });
  });

  it('泳道归属上溯到一级分支', () => {
    expect(laneForBranch(BRANCHES, 'design')).toBe('work');
    expect(laneForBranch(BRANCHES, 'work')).toBe('work');
    expect(laneForBranch(BRANCHES, 'root')).toBe('root');
  });
});
