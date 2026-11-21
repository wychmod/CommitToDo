import { describe, expect, it } from 'vitest';
import type { GroupableTask } from './today-groups';
import { groupTodayTasks } from './today-groups';
import {
  groupArchivedBranches,
  isVisibleInDefaultTree,
  visibleDefaultTree,
  type VisibilityBranch,
} from './branch-visibility';

function branch(
  over: Partial<VisibilityBranch> & Pick<VisibilityBranch, 'id' | 'path'>,
): VisibilityBranch {
  return {
    parentId: null,
    depth: 0,
    title: over.id,
    order: 0,
    status: 'active',
    archivedAt: null,
    deletedAt: null,
    createdAt: 0,
    ...over,
  };
}

function index(nodes: VisibilityBranch[]): Map<string, VisibilityBranch> {
  return new Map(nodes.map((node) => [node.id, node]));
}

function task(
  over: Partial<GroupableTask> & Pick<GroupableTask, 'id' | 'branchId'>,
): GroupableTask {
  return {
    dueDate: null,
    plannedDate: null,
    status: 'open',
    createdAt: 0,
    ...over,
  };
}

const ROOT = branch({ id: 'root', path: '/' });
const L1 = branch({ id: 'l1', path: '/l1/', depth: 1, parentId: 'root' });

describe('归档只写选中分支（R14 回归）', () => {
  it('祖先归档后后代隐藏；取消归档后未被单独归档的后代自动恢复可见', () => {
    const child = branch({ id: 'c', path: '/l1/c/', depth: 2, parentId: 'l1' });
    const archivedParent = { ...L1, archivedAt: 10 };
    const nodes = [ROOT, archivedParent, child];

    expect(visibleDefaultTree(nodes).map((node) => node.id)).toEqual(['root']);
    expect(isVisibleInDefaultTree(child, index(nodes))).toBe(false);
    expect(child.archivedAt).toBeNull();

    const restored = [{ ...archivedParent, archivedAt: null }, child];
    expect(visibleDefaultTree([ROOT, ...restored]).map((node) => node.id)).toEqual([
      'root',
      'l1',
      'c',
    ]);
  });

  it('中间一层曾单独归档：恢复上层后它仍留在归档区，其子分支继续隐藏', () => {
    const middle = {
      ...branch({ id: 'm', path: '/l1/m/', depth: 2, parentId: 'l1' }),
      archivedAt: 11,
    };
    const leaf = branch({ id: 'leaf', path: '/l1/m/leaf/', depth: 3, parentId: 'm' });
    const top = { ...L1, archivedAt: 10 };
    const nodes = [ROOT, top, middle, leaf];

    expect(visibleDefaultTree(nodes).map((node) => node.id)).toEqual(['root']);

    const afterRestoreTop = [ROOT, { ...top, archivedAt: null }, middle, leaf];
    expect(visibleDefaultTree(afterRestoreTop).map((node) => node.id)).toEqual(['root', 'l1']);
    expect(isVisibleInDefaultTree(middle, index(afterRestoreTop))).toBe(false);
    expect(isVisibleInDefaultTree(leaf, index(afterRestoreTop))).toBe(false);
  });

  it('祖先与后代同时归档时，归档区只按最外层列一次', () => {
    const child = {
      ...branch({ id: 'c', path: '/l1/c/', depth: 2, parentId: 'l1' }),
      archivedAt: 12,
    };
    const parent = { ...L1, archivedAt: 10 };
    const groups = groupArchivedBranches([ROOT, parent, child]);

    expect(groups).toHaveLength(1);
    expect(groups[0].groupId).toBe('l1');
    expect(groups[0].archivedCount).toBe(2);
    expect(
      groups[0].rows.map((row) => [row.branch.id, row.indent, row.individuallyArchived]),
    ).toEqual([
      ['l1', 0, true],
      ['c', 1, true],
    ]);
  });

  it('归档区按一级分支分组，未单独归档的后代作为缩进行', () => {
    const other = branch({
      id: 'l2',
      path: '/l2/',
      depth: 1,
      parentId: 'root',
      order: 1,
      title: '考研',
    });
    const archivedDeep = {
      ...branch({ id: 'd', path: '/l2/d/', depth: 2, parentId: 'l2' }),
      archivedAt: 20,
    };
    const deepChild = branch({ id: 'dc', path: '/l2/d/dc/', depth: 3, parentId: 'd' });
    const groups = groupArchivedBranches([ROOT, other, archivedDeep, deepChild]);

    expect(groups.map((group) => group.groupTitle)).toEqual(['考研']);
    expect(
      groups[0].rows.map((row) => [row.branch.id, row.indent, row.individuallyArchived]),
    ).toEqual([
      ['d', 1, true],
      ['dc', 2, false],
    ]);
  });
});

describe('今天分组排除（R8）', () => {
  const todayDate = '2026-11-21';

  it('已放下父分支的待办不进今天任何一组，进行中后代的待办照常出现', () => {
    const dropped = { ...L1, status: 'dropped' as const };
    const child = branch({ id: 'c', path: '/l1/c/', depth: 2, parentId: 'l1' });
    const nodes = [ROOT, dropped, child];
    const tasks = [
      task({ id: 'own', branchId: 'l1', dueDate: '2026-11-19' }),
      task({ id: 'own-planned', branchId: 'l1', plannedDate: todayDate }),
      task({ id: 'child', branchId: 'c', dueDate: '2026-11-19' }),
    ];

    const groups = groupTodayTasks(tasks, nodes, todayDate);
    expect(groups.overdue.map((row) => row.id)).toEqual(['child']);
    expect(groups.today).toEqual([]);
    expect(groups.noDue).toEqual([]);
  });

  it('归档子树下的待办不进今天，祖先未归档时不误伤', () => {
    const archived = { ...L1, archivedAt: 10 };
    const child = branch({ id: 'c', path: '/l1/c/', depth: 2, parentId: 'l1' });
    const tasks = [task({ id: 'hidden', branchId: 'c', plannedDate: todayDate })];

    expect(groupTodayTasks(tasks, [ROOT, archived, child], todayDate).today).toEqual([]);
    expect(
      groupTodayTasks(tasks, [ROOT, { ...archived, archivedAt: null }, child], todayDate).today.map(
        (row) => row.id,
      ),
    ).toEqual(['hidden']);
  });

  it('重新开始后按原 dueDate 与 plannedDate 回到分组', () => {
    const dropped = { ...L1, status: 'dropped' as const };
    const tasks = [
      task({ id: 'planned-today', branchId: 'l1', plannedDate: todayDate, dueDate: '2026-11-01' }),
      task({ id: 'overdue', branchId: 'l1', dueDate: '2026-11-05' }),
      task({ id: 'today-due', branchId: 'l1', dueDate: todayDate }),
      task({ id: 'future', branchId: 'l1', dueDate: '2026-11-30' }),
      task({ id: 'no-due', branchId: 'l1' }),
    ];

    expect(groupTodayTasks(tasks, [ROOT, dropped], todayDate).today).toEqual([]);

    const resumed = { ...dropped, status: 'active' as const };
    const groups = groupTodayTasks(tasks, [ROOT, resumed], todayDate);
    expect(groups.today.map((row) => row.id)).toEqual(['planned-today', 'today-due']);
    expect(groups.overdue.map((row) => row.id)).toEqual(['overdue']);
    expect(groups.noDue.map((row) => row.id)).toEqual(['no-due']);
  });
});
