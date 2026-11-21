import { describe, expect, it } from 'vitest';
import { branchTreeReadonlyReason, type BranchAncestorNode } from './branch-readonly';

function node(over: Partial<BranchAncestorNode> & { id: string }): BranchAncestorNode {
  return {
    parentId: null,
    status: 'active',
    archivedAt: null,
    deletedAt: null,
    ...over,
  };
}

function mapOf(...nodes: BranchAncestorNode[]): Map<string, BranchAncestorNode> {
  return new Map(nodes.map((item) => [item.id, item]));
}

describe('分支只读判定（M04）', () => {
  it('进行中且祖先都未归档时可写', () => {
    const byId = mapOf(node({ id: 'root' }), node({ id: 'work', parentId: 'root' }));
    expect(branchTreeReadonlyReason(byId.get('work')!, byId)).toBeNull();
  });

  it('根分支自身进行中时可写', () => {
    const byId = mapOf(node({ id: 'root' }));
    expect(branchTreeReadonlyReason(byId.get('root')!, byId)).toBeNull();
  });

  it('自身已合并返回 merged', () => {
    const byId = mapOf(node({ id: 'work', status: 'merged' }));
    expect(branchTreeReadonlyReason(byId.get('work')!, byId)).toBe('merged');
  });

  it('自身已放下返回 dropped', () => {
    const byId = mapOf(node({ id: 'work', status: 'dropped' }));
    expect(branchTreeReadonlyReason(byId.get('work')!, byId)).toBe('dropped');
  });

  it('自身已归档返回 archived，优先于生命周期状态', () => {
    const byId = mapOf(node({ id: 'work', archivedAt: 1000, status: 'merged' }));
    expect(branchTreeReadonlyReason(byId.get('work')!, byId)).toBe('archived');
  });

  it('自身已删除返回 deleted', () => {
    const byId = mapOf(node({ id: 'work', deletedAt: 1000 }));
    expect(branchTreeReadonlyReason(byId.get('work')!, byId)).toBe('deleted');
  });

  it('自身进行中但父分支已归档时只读', () => {
    const byId = mapOf(
      node({ id: 'work', archivedAt: 1000 }),
      node({ id: 'design', parentId: 'work' }),
    );
    expect(branchTreeReadonlyReason(byId.get('design')!, byId)).toBe('archived');
  });

  it('祖父已归档时孙分支也只读', () => {
    const byId = mapOf(
      node({ id: 'root', archivedAt: 1000 }),
      node({ id: 'work', parentId: 'root' }),
      node({ id: 'design', parentId: 'work' }),
    );
    expect(branchTreeReadonlyReason(byId.get('design')!, byId)).toBe('archived');
  });

  it('祖先被删除时子树只读', () => {
    const byId = mapOf(
      node({ id: 'work', deletedAt: 1000 }),
      node({ id: 'design', parentId: 'work' }),
    );
    expect(branchTreeReadonlyReason(byId.get('design')!, byId)).toBe('deleted');
  });
});
