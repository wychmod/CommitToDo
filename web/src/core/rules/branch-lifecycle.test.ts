import { describe, expect, it } from 'vitest';
import {
  assessArchive,
  assessPause,
  assessResume,
  assessUnarchive,
  isDropReasonValid,
  normalizeDropReason,
  type LifecycleBranch,
} from './branch-lifecycle';

function branch(
  over: Partial<LifecycleBranch> & Pick<LifecycleBranch, 'id' | 'path'>,
): LifecycleBranch {
  return {
    parentId: null,
    depth: 0,
    status: 'active',
    archivedAt: null,
    deletedAt: null,
    ...over,
  };
}

function index(nodes: LifecycleBranch[]): Map<string, LifecycleBranch> {
  return new Map(nodes.map((node) => [node.id, node]));
}

describe('放下（R15）', () => {
  it('根分支不能放下', () => {
    const root = branch({ id: 'root', path: '/' });
    expect(assessPause(root, index([root]))).toEqual({ allowed: false, reason: 'root' });
  });

  it('已合并、已归档、已放下的分支不能放下', () => {
    const merged = branch({ id: 'm', path: '/m/', depth: 1, status: 'merged' });
    const archived = branch({ id: 'a', path: '/a/', depth: 1, archivedAt: 1 });
    const dropped = branch({ id: 'd', path: '/d/', depth: 1, status: 'dropped' });
    const all = [merged, archived, dropped];
    expect(assessPause(merged, index(all)).reason).toBe('merged');
    expect(assessPause(archived, index(all)).reason).toBe('archived');
    expect(assessPause(dropped, index(all)).reason).toBe('dropped');
  });

  it('进行中分支可以放下', () => {
    const active = branch({ id: 'a', path: '/a/', depth: 1 });
    expect(assessPause(active, index([active]))).toEqual({ allowed: true, reason: null });
  });

  it('原因只有空白或换行时确认不可用', () => {
    expect(isDropReasonValid('')).toBe(false);
    expect(isDropReasonValid('   ')).toBe(false);
    expect(isDropReasonValid('\n\t ')).toBe(false);
    expect(isDropReasonValid(' 这学期先不跑步了 ')).toBe(true);
    expect(normalizeDropReason('  这学期先不跑步了 ')).toBe('这学期先不跑步了');
  });
});

describe('重新开始（R15）', () => {
  it('只有已放下的非根分支可以重新开始', () => {
    const active = branch({ id: 'a', path: '/a/', depth: 1 });
    const merged = branch({ id: 'm', path: '/m/', depth: 1, status: 'merged' });
    expect(assessResume(active, index([active])).reason).toBe('not-dropped');
    expect(assessResume(merged, index([merged])).reason).toBe('not-dropped');
  });

  it('已归档的已放下分支不能直接重新开始', () => {
    const dropped = branch({
      id: 'd',
      path: '/d/',
      depth: 1,
      status: 'dropped',
      archivedAt: 1,
    });
    expect(assessResume(dropped, index([dropped])).reason).toBe('archived');
  });

  it('祖先链中间一层归档时返回「祖先已归档」', () => {
    const root = branch({ id: 'root', path: '/' });
    const l1 = branch({ id: 'l1', path: '/l1/', depth: 1, parentId: 'root' });
    const l2 = branch({ id: 'l2', path: '/l1/l2/', depth: 2, parentId: 'l1', archivedAt: 5 });
    const l3 = branch({
      id: 'l3',
      path: '/l1/l2/l3/',
      depth: 3,
      parentId: 'l2',
      status: 'dropped',
    });
    expect(assessResume(l3, index([root, l1, l2, l3]))).toEqual({
      allowed: false,
      reason: 'ancestor-archived',
    });
  });

  it('祖先已合并时返回「祖先已合并」', () => {
    const root = branch({ id: 'root', path: '/' });
    const parent = branch({ id: 'p', path: '/p/', depth: 1, parentId: 'root', status: 'merged' });
    const child = branch({
      id: 'c',
      path: '/p/c/',
      depth: 2,
      parentId: 'p',
      status: 'dropped',
    });
    expect(assessResume(child, index([root, parent, child]))).toEqual({
      allowed: false,
      reason: 'ancestor-merged',
    });
  });

  it('祖先均可见且未合并时允许重新开始', () => {
    const root = branch({ id: 'root', path: '/' });
    const parent = branch({ id: 'p', path: '/p/', depth: 1, parentId: 'root' });
    const child = branch({
      id: 'c',
      path: '/p/c/',
      depth: 2,
      parentId: 'p',
      status: 'dropped',
    });
    expect(assessResume(child, index([root, parent, child]))).toEqual({
      allowed: true,
      reason: null,
    });
  });
});

describe('归档（R14）', () => {
  it('根分支与进行中分支不能归档', () => {
    const root = branch({ id: 'root', path: '/' });
    const active = branch({ id: 'a', path: '/a/', depth: 1 });
    expect(assessArchive(root, index([root])).reason).toBe('root');
    expect(assessArchive(active, index([active])).reason).toBe('active');
  });

  it('已归档分支不能再次归档', () => {
    const merged = branch({ id: 'm', path: '/m/', depth: 1, status: 'merged', archivedAt: 1 });
    expect(assessArchive(merged, index([merged])).reason).toBe('archived');
  });

  it('存在进行中后代时不可归档，并写明「还有进行中的子分支」', () => {
    const dropped = branch({ id: 'd', path: '/d/', depth: 1, status: 'dropped' });
    const child = branch({ id: 'c', path: '/d/c/', depth: 2, parentId: 'd' });
    expect(assessArchive(dropped, index([dropped, child]))).toEqual({
      allowed: false,
      reason: 'active-descendants',
    });
  });

  it('已放下且没有进行中后代的分支可以归档', () => {
    const dropped = branch({ id: 'd', path: '/d/', depth: 1, status: 'dropped' });
    const mergedChild = branch({
      id: 'c',
      path: '/d/c/',
      depth: 2,
      parentId: 'd',
      status: 'merged',
    });
    expect(assessArchive(dropped, index([dropped, mergedChild]))).toEqual({
      allowed: true,
      reason: null,
    });
  });
});

describe('取消归档（R14）', () => {
  it('未归档分支不能取消归档', () => {
    const node = branch({ id: 'a', path: '/a/', depth: 1 });
    expect(assessUnarchive(node, index([node])).reason).toBe('not-archived');
  });

  it('父分支仍归档时不可取消归档', () => {
    const parent = branch({ id: 'p', path: '/p/', depth: 1, status: 'merged', archivedAt: 1 });
    const child = branch({
      id: 'c',
      path: '/p/c/',
      depth: 2,
      parentId: 'p',
      status: 'dropped',
      archivedAt: 2,
    });
    expect(assessUnarchive(child, index([parent, child]))).toEqual({
      allowed: false,
      reason: 'ancestor-archived',
    });
  });

  it('祖先恢复后允许取消归档', () => {
    const parent = branch({ id: 'p', path: '/p/', depth: 1, status: 'merged' });
    const child = branch({
      id: 'c',
      path: '/p/c/',
      depth: 2,
      parentId: 'p',
      status: 'dropped',
      archivedAt: 2,
    });
    expect(assessUnarchive(child, index([parent, child]))).toEqual({
      allowed: true,
      reason: null,
    });
  });
});
