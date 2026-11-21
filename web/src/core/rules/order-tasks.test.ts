import { describe, expect, it } from 'vitest';
import { groupTodayTasks, sortByManualOrder, type GroupableTask } from './today-groups';

const todayDate = '2026-11-21';

const branch = {
  id: 'branch',
  parentId: null,
  status: 'active' as const,
  archivedAt: null,
};

const task = (patch: Partial<GroupableTask> & { id: string }): GroupableTask => ({
  branchId: 'branch',
  dueDate: todayDate,
  plannedDate: null,
  status: 'open',
  createdAt: 1,
  order: null,
  ...patch,
});

describe('今天组内手动排序（V1-08 / OP-01）', () => {
  it('有 order 的按升序，未设置的按 M03 默认排在已设置项之后', () => {
    const rows = [
      task({ id: 'unset-late', order: null, dueDate: '2026-11-30' }),
      task({ id: 'first', order: 1 }),
      task({ id: 'unset-early', order: null, dueDate: '2026-11-01' }),
      task({ id: 'second', order: 2 }),
    ];
    expect(sortByManualOrder(rows).map((row) => row.id)).toEqual([
      'first',
      'second',
      'unset-early',
      'unset-late',
    ]);
  });

  it('同 dueDate 且同日创建时按 id 稳定排序', () => {
    const rows = [
      task({ id: 'b', order: null, createdAt: 10 }),
      task({ id: 'a', order: null, createdAt: 10 }),
      task({ id: 'c', order: null, createdAt: 5 }),
    ];
    expect(sortByManualOrder(rows).map((row) => row.id)).toEqual(['c', 'a', 'b']);
  });

  it('部分 order 缺失时已有顺序完全保留', () => {
    const rows = [
      task({ id: 'three', order: 3 }),
      task({ id: 'one', order: 1 }),
      task({ id: 'none', order: null }),
      task({ id: 'two', order: 2 }),
    ];
    expect(sortByManualOrder(rows).map((row) => row.id)).toEqual(['one', 'two', 'three', 'none']);
  });

  it('新增待办取同级最大 order +1 后落在组末尾', () => {
    const existing = [task({ id: 'a', order: 1 }), task({ id: 'b', order: 2 })];
    const maxOrder = Math.max(...existing.map((row) => row.order ?? 0));
    const added = task({ id: 'new', order: maxOrder + 1 });
    expect(sortByManualOrder([...existing, added]).map((row) => row.id)).toEqual(['a', 'b', 'new']);
  });

  it('完成或取消后分组重算，剩余项保持手动顺序', () => {
    const rows = [
      task({ id: 'a', order: 1 }),
      task({ id: 'b', order: 2, status: 'done' }),
      task({ id: 'c', order: 3 }),
      task({ id: 'd', order: 4, status: 'cancelled' }),
    ];
    const groups = groupTodayTasks(rows, [branch], todayDate);
    expect(groups.today.map((row) => row.id)).toEqual(['a', 'c']);
    expect(sortByManualOrder(groups.today).map((row) => row.id)).toEqual(['a', 'c']);
  });

  it('分组仍按 R8 现算，order 不改变归属', () => {
    const rows = [
      task({ id: 'overdue', order: 9, dueDate: '2026-11-01' }),
      task({ id: 'today', order: 1 }),
      task({ id: 'noDue', order: 5, dueDate: null }),
    ];
    const groups = groupTodayTasks(rows, [branch], todayDate);
    expect(groups.overdue.map((row) => row.id)).toEqual(['overdue']);
    expect(groups.today.map((row) => row.id)).toEqual(['today']);
    expect(groups.noDue.map((row) => row.id)).toEqual(['noDue']);
  });
});
