/**
 * 今天三组与全部待办分组（TECH-ARCHITECTURE.md §5.3.3 R8）。
 *
 * 纯函数：不读库、不取当前时间；调用方传入同一个「今天」字符串。
 * 分组优先级：`plannedDate = today` 一律进今天组，即使 `dueDate` 已过去；
 * 逾期只认「`dueDate < today` 且 `plannedDate !== today`」。
 */

export interface GroupableTask {
  id: string;
  branchId: string;
  dueDate: string | null;
  plannedDate: string | null;
  status: 'open' | 'done' | 'cancelled';
  createdAt: number;
  order?: number | null;
  deletedAt?: number | null;
}

export type TodayGroupKey = 'overdue' | 'today' | 'noDue';

export interface GroupableBranch {
  id: string;
  parentId: string | null;
  status: 'active' | 'merged' | 'dropped';
  archivedAt: number | null;
  deletedAt?: number | null;
}

export interface TodayGroups<T extends GroupableTask> {
  overdue: T[];
  today: T[];
  noDue: T[];
  /** 页头「N 条有截止日期」，只统计页面上出现的有截止待办。 */
  dueCount: number;
  /** 页头「另有 M 条无截止日期」。 */
  noDueCount: number;
}

export interface AllTodoGroups<T extends GroupableTask> {
  overdue: T[];
  upcoming: T[];
  noDue: T[];
}

const byDueThenCreated = (a: GroupableTask, b: GroupableTask): number => {
  const dueA = a.dueDate ?? '9999-12-31';
  const dueB = b.dueDate ?? '9999-12-31';
  return dueA.localeCompare(dueB) || a.createdAt - b.createdAt || a.id.localeCompare(b.id);
};

const byCreated = (a: GroupableTask, b: GroupableTask): number =>
  a.createdAt - b.createdAt || a.id.localeCompare(b.id);

/** 一条打开待办在今天页的归属组；未来到期返回 null（V1-08 拖拽校验用）。 */
export function todayGroupKey(task: GroupableTask, todayDate: string): TodayGroupKey | null {
  if (task.status !== 'open' || task.deletedAt) return null;
  if (task.plannedDate === todayDate) return 'today';
  if (task.dueDate === null) return 'noDue';
  if (task.dueDate === todayDate) return 'today';
  if (task.dueDate < todayDate) return 'overdue';
  return null;
}

/** 手动排序后的组内顺序：`order` 升序；未设置 `order` 的按 M03 默认排在最后。 */
export function sortByManualOrder<T extends GroupableTask>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => {
    const hasA = a.order !== null && a.order !== undefined;
    const hasB = b.order !== null && b.order !== undefined;
    if (hasA && hasB) {
      return a.order! - b.order! || a.createdAt - b.createdAt || a.id.localeCompare(b.id);
    }
    if (hasA) return -1;
    if (hasB) return 1;
    return byDueThenCreated(a, b);
  });
}

/**
 * 待办是否被所在分支挡在今天之外。
 *
 * R8 只认软删、归档与「待办自己的分支」为 `dropped`；
 * 父分支放下不连带子分支：进行中的后代待办照常出现在今天（V1-01）。
 */
function isOutsideDefaultTree(task: GroupableTask, byId: Map<string, GroupableBranch>): boolean {
  const own = byId.get(task.branchId);
  // 分支行不存在时无法判定归属，按不可见处理，避免孤儿待办混进今天。
  if (!own) return true;
  if (own.status === 'dropped') return true;

  let current: GroupableBranch | undefined = own;
  let guard = 0;
  while (current && guard < 8) {
    if (current.deletedAt || current.archivedAt !== null) return true;
    current = current.parentId ? byId.get(current.parentId) : undefined;
    guard += 1;
  }
  return false;
}

/**
 * P01 今天页三组。
 *
 * 未来到期（`dueDate > today` 且未安排到今天）不属于今天页任何一组；
 * 它们只出现在 `/today/all` 的「未来到期」。页头两个计数与页面上
 * 实际出现的待办保持一致。
 */
export function groupTodayTasks<T extends GroupableTask>(
  tasks: readonly T[],
  branches: readonly GroupableBranch[],
  todayDate: string,
): TodayGroups<T> {
  const byId = new Map(branches.map((branch) => [branch.id, branch]));
  const overdue: T[] = [];
  const today: T[] = [];
  const noDue: T[] = [];

  for (const task of tasks) {
    if (task.status !== 'open' || task.deletedAt) continue;
    if (isOutsideDefaultTree(task, byId)) continue;

    if (task.plannedDate === todayDate) {
      today.push(task);
      continue;
    }
    if (task.dueDate === null) {
      noDue.push(task);
      continue;
    }
    if (task.dueDate === todayDate) {
      today.push(task);
      continue;
    }
    if (task.dueDate < todayDate) {
      overdue.push(task);
    }
  }

  overdue.sort(byDueThenCreated);
  today.sort(byDueThenCreated);
  noDue.sort(byCreated);

  let dueCount = overdue.length;
  let noDueCount = noDue.length;
  for (const task of today) {
    if (task.dueDate === null) noDueCount += 1;
    else dueCount += 1;
  }

  return { overdue, today, noDue, dueCount, noDueCount };
}

/**
 * `/today/all` 默认三组：逾期 / 未来到期 / 无截止。
 *
 * 调用方先按筛选条件过滤；这里只负责分组与排序，同一待办只进一组。
 */
export function groupAllTodoTasks<T extends GroupableTask>(
  tasks: readonly T[],
  todayDate: string,
): AllTodoGroups<T> {
  const overdue: T[] = [];
  const upcoming: T[] = [];
  const noDue: T[] = [];

  for (const task of tasks) {
    if (task.status !== 'open' || task.deletedAt) continue;
    if (task.dueDate === null) noDue.push(task);
    else if (task.dueDate < todayDate) overdue.push(task);
    else upcoming.push(task);
  }

  overdue.sort(byDueThenCreated);
  upcoming.sort(byDueThenCreated);
  noDue.sort(byCreated);

  return { overdue, upcoming, noDue };
}
