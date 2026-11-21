import { describe, expect, it } from 'vitest';
import { assessDelete, type DeleteNode } from './delete-guard';

const node = (over: Partial<DeleteNode> = {}): DeleteNode => ({
  id: 'leaf',
  path: '/parent/leaf/',
  depth: 2,
  status: 'active',
  archivedAt: null,
  ...over,
});

const emptyInput = (subject: DeleteNode) => ({
  subject,
  subtree: [subject],
  tasks: [],
  commits: [],
  milestones: [],
});

describe('删除空分支守卫（R13 / OP-06）', () => {
  it('整棵子树为空的进行中分支可以删除', () => {
    const guard = assessDelete(emptyInput(node()));
    expect(guard).toMatchObject({ allowed: true, reasons: [], subtreeIds: ['leaf'] });
  });

  it('根分支恒不可删，即使没有任何内容', () => {
    const guard = assessDelete(emptyInput(node({ id: 'root', depth: 0, path: '/' })));
    expect(guard.allowed).toBe(false);
    expect(guard.reasons).toContain('root');
  });

  it('任一条待办（含已取消）都会阻止删除', () => {
    const guard = assessDelete({
      ...emptyInput(node()),
      tasks: [{ branchId: 'leaf' }],
    });
    expect(guard.reasons).toEqual(['has-tasks']);
  });

  it('最深一层的提交也会阻止删除', () => {
    const root = node({ id: 'parent', depth: 1, path: '/parent/' });
    const leaf = node();
    const guard = assessDelete({
      subject: root,
      subtree: [root, leaf],
      tasks: [],
      commits: [{ branchId: 'leaf' }],
      milestones: [],
    });
    expect(guard.reasons).toContain('has-commits');
  });

  it('已撤销提交仍算提交痕迹', () => {
    const guard = assessDelete({
      ...emptyInput(node()),
      commits: [{ branchId: 'leaf' }],
    });
    expect(guard.allowed).toBe(false);
  });

  it('里程碑与子分支分别给出原因', () => {
    const root = node({ id: 'parent', depth: 1, path: '/parent/' });
    const leaf = node();
    const guard = assessDelete({
      subject: root,
      subtree: [root, leaf],
      tasks: [],
      commits: [],
      milestones: [{ branchId: 'leaf' }],
    });
    expect(guard.reasons).toEqual(['has-children', 'has-milestones']);
  });

  it('归档、收尾、放下与删除记录都会阻止删除', () => {
    expect(assessDelete(emptyInput(node({ archivedAt: 1 }))).reasons).toContain('archived');
    expect(assessDelete(emptyInput(node({ status: 'merged', finishedAt: 1 }))).reasons).toContain(
      'merged',
    );
    expect(assessDelete(emptyInput(node({ status: 'dropped', droppedAt: 1 }))).reasons).toContain(
      'dropped',
    );
    expect(assessDelete(emptyInput(node({ deletedAt: 1 }))).reasons).toContain('deleted');
  });

  it('收尾、放下与纠错事件也算历史痕迹', () => {
    const guard = assessDelete({
      ...emptyInput(node()),
      events: [
        { entityId: 'leaf', action: 'branch.create' },
        { entityId: 'leaf', action: 'commit.void' },
      ],
    });
    expect(guard.allowed).toBe(false);
    expect(guard.reasons).toEqual(['has-history']);
  });

  it('多项不满足时逐条返回原因，顺序稳定', () => {
    const guard = assessDelete({
      ...emptyInput(node({ archivedAt: 1 })),
      tasks: [{ branchId: 'leaf' }],
      commits: [{ branchId: 'leaf' }],
      milestones: [{ branchId: 'leaf' }],
    });
    expect(guard.reasons).toEqual(['archived', 'has-tasks', 'has-commits', 'has-milestones']);
  });
});
