import { describe, expect, it } from 'vitest';
import { resolveTreeDensity } from './tree-density';

describe('resolveTreeDensity（K-01）', () => {
  it('紧凑：树 32 / 列表 36 / 日期隐藏', () => {
    expect(resolveTreeDensity('compact')).toEqual({
      density: 'compact',
      treeRowHeight: 32,
      listRowHeight: 36,
      showNodeDate: false,
    });
  });

  it('舒适：树 48 / 列表 44 / 日期显示', () => {
    expect(resolveTreeDensity('comfortable')).toEqual({
      density: 'comfortable',
      treeRowHeight: 48,
      listRowHeight: 44,
      showNodeDate: true,
    });
  });

  it('两档之外回落舒适', () => {
    expect(resolveTreeDensity(undefined).density).toBe('comfortable');
    expect(resolveTreeDensity(null).density).toBe('comfortable');
    expect(resolveTreeDensity('').density).toBe('comfortable');
    expect(resolveTreeDensity('dense').density).toBe('comfortable');
  });

  it('返回值不含展开状态，调用方传入的展开集合不被改写', () => {
    const expanded = new Set(['work', 'life']);
    const metrics = resolveTreeDensity('compact');
    expect(Object.keys(metrics).sort()).toEqual([
      'density',
      'listRowHeight',
      'showNodeDate',
      'treeRowHeight',
    ]);
    expect([...expanded]).toEqual(['work', 'life']);
  });
});
