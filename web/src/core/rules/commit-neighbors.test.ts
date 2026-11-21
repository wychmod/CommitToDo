import { describe, expect, it } from 'vitest';
import { commitNeighbors, type NeighborCommitRow } from './commit-neighbors';

function row(over: Partial<NeighborCommitRow> & { id: string; at: number }): NeighborCommitRow {
  return {
    sourceBranchId: 'work',
    voidedAt: null,
    deletedAt: null,
    ...over,
  };
}

describe('提交前后节点（M05）', () => {
  it('首条没有前、末条没有后', () => {
    const rows = [row({ id: 'a', at: 1 }), row({ id: 'b', at: 2 }), row({ id: 'c', at: 3 })];
    expect(commitNeighbors(rows, rows[0]!)).toEqual({ prev: null, next: rows[1] });
    expect(commitNeighbors(rows, rows[2]!)).toEqual({ prev: rows[1], next: null });
  });

  it('中间节点前后都取相邻有效提交', () => {
    const rows = [row({ id: 'a', at: 1 }), row({ id: 'b', at: 2 }), row({ id: 'c', at: 3 })];
    const neighbors = commitNeighbors(rows, rows[1]!);
    expect(neighbors.prev?.id).toBe('a');
    expect(neighbors.next?.id).toBe('c');
  });

  it('紧邻节点刚被撤销时跳过它', () => {
    const rows = [
      row({ id: 'a', at: 1 }),
      row({ id: 'b', at: 2, voidedAt: 9 }),
      row({ id: 'c', at: 3 }),
    ];
    const neighbors = commitNeighbors(rows, rows[0]!);
    expect(neighbors.next?.id).toBe('c');
  });

  it('不同 sourceBranchId 不混入同一条链', () => {
    const rows = [
      row({ id: 'a', at: 1 }),
      row({ id: 'merged', at: 2, sourceBranchId: 'design' }),
      row({ id: 'c', at: 3 }),
    ];
    expect(commitNeighbors(rows, rows[0]!).next?.id).toBe('c');
  });

  it('同一 at 的两条都在链上，并列顺序不断言', () => {
    const rows = [row({ id: 'a', at: 1 }), row({ id: 'b', at: 1 }), row({ id: 'c', at: 2 })];
    const neighbors = commitNeighbors(rows, rows[1]!);
    const ids = [neighbors.prev?.id, neighbors.next?.id].filter(Boolean);
    expect(ids).toContain('a');
    expect(ids).toContain('c');
  });

  it('当前提交已被撤销时仍能按 at 找到相邻项', () => {
    const rows = [
      row({ id: 'a', at: 1 }),
      row({ id: 'current', at: 2, voidedAt: 9 }),
      row({ id: 'c', at: 3 }),
    ];
    const neighbors = commitNeighbors(rows, rows[1]!);
    expect(neighbors.prev?.id).toBe('a');
    expect(neighbors.next?.id).toBe('c');
  });

  it('分支已合并时按 sourceBranchId 取链', () => {
    const rows = [
      row({ id: 'a', at: 1, sourceBranchId: 'design' }),
      row({ id: 'b', at: 2, sourceBranchId: 'design' }),
    ];
    const current = row({ id: 'b', at: 2, sourceBranchId: 'design' });
    expect(commitNeighbors(rows, current).prev?.id).toBe('a');
  });
});
