import { describe, expect, it } from 'vitest';
import { resolveUndoBranchId, type UndoBranchNode } from './undo-target';

function node(over: Partial<UndoBranchNode> & { id: string }): UndoBranchNode {
  return { parentId: null, status: 'active', archivedAt: null, deletedAt: null, ...over };
}

function mapOf(...nodes: UndoBranchNode[]): Map<string, UndoBranchNode> {
  return new Map(nodes.map((item) => [item.id, item]));
}

describe('撤销后的待办去向（M05）', () => {
  it('原分支进行中时留在原分支', () => {
    const byId = mapOf(node({ id: 'root' }), node({ id: 'work', parentId: 'root' }));
    expect(resolveUndoBranchId('work', byId)).toBe('work');
  });

  it('直接父分支已收尾时回到父分支', () => {
    const byId = mapOf(
      node({ id: 'root' }),
      node({ id: 'work', parentId: 'root' }),
      node({ id: 'design', parentId: 'work', status: 'merged' }),
    );
    expect(resolveUndoBranchId('design', byId)).toBe('work');
  });

  it('连续两层都不可接收时继续向上', () => {
    const byId = mapOf(
      node({ id: 'root' }),
      node({ id: 'work', parentId: 'root' }),
      node({ id: 'design', parentId: 'work', status: 'dropped' }),
      node({ id: 'ui', parentId: 'design', archivedAt: 1000 }),
    );
    expect(resolveUndoBranchId('ui', byId)).toBe('work');
  });

  it('原分支即根分支时返回根分支', () => {
    const byId = mapOf(node({ id: 'root' }));
    expect(resolveUndoBranchId('root', byId)).toBe('root');
  });

  it('原分支已归档时向上取最近可接收祖先', () => {
    const byId = mapOf(
      node({ id: 'root' }),
      node({ id: 'work', parentId: 'root' }),
      node({ id: 'design', parentId: 'work', archivedAt: 1000 }),
    );
    expect(resolveUndoBranchId('design', byId)).toBe('work');
  });

  it('整条链都不可接收时落到根分支', () => {
    const byId = mapOf(
      node({ id: 'root', archivedAt: 1000 }),
      node({ id: 'work', parentId: 'root', status: 'dropped' }),
    );
    expect(resolveUndoBranchId('work', byId)).toBe('root');
  });

  it('找不到原分支时原样返回，交由用例报 not_found', () => {
    expect(resolveUndoBranchId('ghost', mapOf(node({ id: 'root' })))).toBe('ghost');
  });
});
