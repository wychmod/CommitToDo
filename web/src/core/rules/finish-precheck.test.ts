import { describe, expect, it } from 'vitest';
import { assessFinish, finishEntryReason, type FinishNode } from './finish-precheck';

const node = (over: Partial<FinishNode> = {}): FinishNode => ({
  id: 'child',
  parentId: 'parent',
  depth: 1,
  status: 'active',
  archivedAt: null,
  ...over,
});

const parent = (over: Partial<FinishNode> = {}): FinishNode =>
  node({ id: 'parent', parentId: 'root', depth: 1, ...over });

describe('收尾预检（R12 / OP-08）', () => {
  it('父分支进行中且未归档时可以收尾，并返回去向与条数', () => {
    const result = assessFinish({
      subject: node(),
      parent: parent({ id: 'parent' }),
      descendants: [],
      commitCount: 3,
      openTaskCount: 2,
    });

    expect(result).toMatchObject({
      allowed: true,
      reason: null,
      commitCount: 3,
      openTaskCount: 2,
    });
    expect(result.parent?.id).toBe('parent');
  });

  it('根分支恒不可收尾', () => {
    const root = node({ id: 'root', parentId: null, depth: 0 });
    expect(
      assessFinish({
        subject: root,
        parent: undefined,
        descendants: [],
        commitCount: 0,
        openTaskCount: 0,
      }),
    ).toMatchObject({ allowed: false, reason: 'root' });
  });

  it('自身已合并、已归档、已放下或已删除均不可收尾', () => {
    for (const over of [
      { status: 'merged' as const },
      { archivedAt: 1 },
      { status: 'dropped' as const },
      { deletedAt: 2 },
    ]) {
      expect(finishEntryReason(node(over), parent(), [])).toBe('readonly');
    }
  });

  it('父分支已放下、已归档或已合并时不可收尾', () => {
    expect(finishEntryReason(node(), parent({ status: 'dropped' }), [])).toBe('parent-readonly');
    expect(finishEntryReason(node(), parent({ status: 'merged' }), [])).toBe('parent-readonly');
    expect(finishEntryReason(node(), parent({ archivedAt: 1 }), [])).toBe('parent-readonly');
  });

  it('找不到父分支时不可收尾', () => {
    expect(finishEntryReason(node(), undefined, [])).toBe('parent-missing');
    expect(finishEntryReason(node(), parent({ deletedAt: 1 }), [])).toBe('parent-missing');
  });

  it('存在进行中后代时不可收尾；后代全部已合并或已归档则可以', () => {
    expect(finishEntryReason(node(), parent(), [node({ id: 'open-desc', depth: 2 })])).toBe(
      'unfinished-descendant',
    );

    expect(
      finishEntryReason(node(), parent(), [
        node({ id: 'merged-desc', depth: 2, status: 'merged' }),
        node({ id: 'archived-desc', depth: 2, archivedAt: 5 }),
      ]),
    ).toBeNull();
  });

  it('软删后代不算进行中', () => {
    expect(
      finishEntryReason(node(), parent(), [node({ id: 'gone', depth: 2, deletedAt: 3 })]),
    ).toBeNull();
  });
});
