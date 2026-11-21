import { describe, expect, it } from 'vitest';
import { reorderIds, sequentialOrders, type DragScope } from './drag-order';
import { sortByManualOrder } from './today-groups';

const scope = { group: 'noDue' };

const move = (
  ids: string[],
  draggedId: string,
  targetId: string,
  position: 'before' | 'after',
  source: DragScope = scope,
  target: DragScope = scope,
) => reorderIds(ids, draggedId, targetId, position, source, target);

describe('组内拖拽排序（V1-08 / OP-01）', () => {
  it('把首条拖到末条之后', () => {
    const result = move(['a', 'b', 'c'], 'a', 'c', 'after');
    expect(result).toEqual({ ok: true, ids: ['b', 'c', 'a'], changed: true });
  });

  it('把末条拖到首条之前', () => {
    expect(move(['a', 'b', 'c'], 'c', 'a', 'before')).toEqual({
      ok: true,
      ids: ['c', 'a', 'b'],
      changed: true,
    });
  });

  it('拖到自身位置是无操作', () => {
    expect(move(['a', 'b', 'c'], 'b', 'b', 'before')).toEqual({
      ok: true,
      ids: ['a', 'b', 'c'],
      changed: false,
    });
  });

  it('跨组拒绝', () => {
    expect(move(['a', 'b'], 'a', 'b', 'after', { group: 'today' }, { group: 'noDue' })).toEqual({
      ok: false,
      reason: 'cross-group',
    });
  });

  it('分支树跨父拒绝', () => {
    expect(
      move(
        ['a', 'b'],
        'a',
        'b',
        'after',
        { group: 'work', parentId: 'root' },
        { group: 'work', parentId: 'life' },
      ),
    ).toEqual({ ok: false, reason: 'cross-parent' });
  });

  it('同组只有一条时拒绝', () => {
    expect(move(['a'], 'a', 'a', 'after')).toEqual({ ok: false, reason: 'single' });
  });

  it('落点不在列表时保持原顺序', () => {
    expect(move(['a', 'b'], 'a', 'missing', 'after')).toEqual({
      ok: true,
      ids: ['a', 'b'],
      changed: false,
    });
  });
});

describe('写入 order 的规整（V1-08 / OP-01）', () => {
  it('按显示顺序写成 1..n', () => {
    expect(sequentialOrders(['c', 'a', 'b'])).toEqual([
      { id: 'c', order: 1 },
      { id: 'a', order: 2 },
      { id: 'b', order: 3 },
    ]);
  });

  it('缺失与重复值在手动排序后按 order 升序稳定展示', () => {
    const rows = [
      {
        id: 'a',
        order: 2,
        createdAt: 3,
        branchId: 'x',
        dueDate: null,
        plannedDate: null,
        status: 'open' as const,
      },
      {
        id: 'b',
        order: null,
        createdAt: 1,
        branchId: 'x',
        dueDate: null,
        plannedDate: null,
        status: 'open' as const,
      },
      {
        id: 'c',
        order: 2,
        createdAt: 2,
        branchId: 'x',
        dueDate: null,
        plannedDate: null,
        status: 'open' as const,
      },
    ];
    expect(sortByManualOrder(rows).map((row) => row.id)).toEqual(['c', 'a', 'b']);
  });
});
