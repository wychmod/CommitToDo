import { describe, expect, it } from 'vitest';
import {
  groupAllTodoTasks,
  groupTodayTasks,
  type GroupableBranch,
  type GroupableTask,
} from './today-groups';

const TODAY = '2026-11-21';

const branch = (over: Partial<GroupableBranch> = {}): GroupableBranch => ({
  id: 'work',
  parentId: 'root',
  status: 'active',
  archivedAt: null,
  ...over,
});

const task = (over: Partial<GroupableTask> = {}): GroupableTask => ({
  id: 'task-1',
  branchId: 'work',
  dueDate: null,
  plannedDate: null,
  status: 'open',
  createdAt: 1_000,
  ...over,
});

const branches = (extra: GroupableBranch[] = []): GroupableBranch[] => [
  branch({ id: 'root', parentId: null }),
  branch(),
  ...extra,
];

describe('groupTodayTasks（R8 今天三组）', () => {
  it('逾期只取 dueDate < today 且未安排到今天', () => {
    const result = groupTodayTasks(
      [
        task({ id: 'late', dueDate: '2026-11-18' }),
        task({ id: 'planned', dueDate: '2026-11-18', plannedDate: TODAY }),
        task({ id: 'on-time', dueDate: TODAY }),
        task({ id: 'future', dueDate: '2026-11-24' }),
      ],
      branches(),
      TODAY,
    );

    expect(result.overdue.map((row) => row.id)).toEqual(['late']);
    expect(result.today.map((row) => row.id)).toEqual(['planned', 'on-time']);
    expect(result.noDue).toEqual([]);
  });

  it('plannedDate = today 优先归今天，即使截止日期在过去或未来', () => {
    const result = groupTodayTasks(
      [
        task({ id: 'past', dueDate: '2026-10-01', plannedDate: TODAY }),
        task({ id: 'future', dueDate: '2026-12-01', plannedDate: TODAY }),
        task({ id: 'none', dueDate: null, plannedDate: TODAY }),
      ],
      branches(),
      TODAY,
    );

    expect(result.overdue).toEqual([]);
    expect(result.today.map((row) => row.id)).toEqual(['past', 'future', 'none']);
    expect(result.noDue).toEqual([]);
  });

  it('dueDate = null 归无截止；未来到期不进今天页', () => {
    const result = groupTodayTasks(
      [task({ id: 'none', dueDate: null }), task({ id: 'future', dueDate: '2026-11-25' })],
      branches(),
      TODAY,
    );

    expect(result.noDue.map((row) => row.id)).toEqual(['none']);
    expect(result.overdue).toEqual([]);
    expect(result.today).toEqual([]);
  });

  it('组内按截止日期升序、同日按创建顺序，且同一条只出现一次', () => {
    const result = groupTodayTasks(
      [
        task({ id: 'b', dueDate: '2026-11-19', createdAt: 2 }),
        task({ id: 'a', dueDate: '2026-11-19', createdAt: 1 }),
        task({ id: 'c', dueDate: '2026-11-18', createdAt: 9 }),
      ],
      branches(),
      TODAY,
    );

    expect(result.overdue.map((row) => row.id)).toEqual(['c', 'a', 'b']);
    expect(result.overdue).toHaveLength(3);
  });

  it('页头两个计数与页面上出现的待办条数一致', () => {
    const result = groupTodayTasks(
      [
        task({ id: 'late', dueDate: '2026-11-18' }),
        task({ id: 'today', dueDate: TODAY }),
        task({ id: 'planned-none', dueDate: null, plannedDate: TODAY }),
        task({ id: 'none', dueDate: null }),
      ],
      branches(),
      TODAY,
    );

    expect(result.dueCount).toBe(2);
    expect(result.noDueCount).toBe(2);
    expect(result.dueCount + result.noDueCount).toBe(
      result.overdue.length + result.today.length + result.noDue.length,
    );
  });

  it('父分支已放下或已归档时不进今天', () => {
    const result = groupTodayTasks(
      [
        task({ id: 'under-dropped', branchId: 'dropped' }),
        task({ id: 'under-archived', branchId: 'archived' }),
        task({ id: 'visible' }),
      ],
      branches([
        branch({ id: 'dropped', status: 'dropped', parentId: 'root' }),
        branch({ id: 'archived', archivedAt: 1_700_000_000_000, parentId: 'root' }),
      ]),
      TODAY,
    );

    expect(result.today).toEqual([]);
    expect(result.noDue.map((row) => row.id)).toEqual(['visible']);
  });

  it('已完成、已取消与软删的待办不参与分组', () => {
    const result = groupTodayTasks(
      [
        task({ id: 'done', status: 'done', dueDate: TODAY }),
        task({ id: 'cancelled', status: 'cancelled', dueDate: TODAY }),
        task({ id: 'deleted', deletedAt: 1, dueDate: TODAY }),
      ],
      branches(),
      TODAY,
    );

    expect(result.today).toEqual([]);
    expect(result.dueCount).toBe(0);
  });
});

describe('groupAllTodoTasks（S01 全部待办）', () => {
  it('按逾期 / 未来到期 / 无截止分组，截止今天算未来到期', () => {
    const result = groupAllTodoTasks(
      [
        task({ id: 'late', dueDate: '2026-11-18' }),
        task({ id: 'today', dueDate: TODAY }),
        task({ id: 'future', dueDate: '2026-11-27' }),
        task({ id: 'none', dueDate: null }),
      ],
      TODAY,
    );

    expect(result.overdue.map((row) => row.id)).toEqual(['late']);
    expect(result.upcoming.map((row) => row.id)).toEqual(['today', 'future']);
    expect(result.noDue.map((row) => row.id)).toEqual(['none']);
  });
});
