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
  deletedAt?: number | null;
}

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

/**
 * 待办是否被所在分支（含祖先）挡在今天之外。
 *
 * R8 只认软删、归档与 `dropped`；`merged` 分支的未完成待办在收尾时
 * 已由 M08 处理，这里不额外排除，保持规则表口径单一。
 */
function isOutsideDefaultTree(task: GroupableTask, byId: Map<string, GroupableBranch>): boolean {
  let current = byId.get(task.branchId);
  let guard = 0;
  while (current && guard < 8) {
    if (current.deletedAt || current.archivedAt !== null || current.status === 'dropped') {
      return true;
    }
    current = current.parentId ? byId.get(current.parentId) : undefined;
    guard += 1;
  }
  // 分支行不存在时无法判定归属，按不可见处理，避免孤儿待办混进今天。
  return !byId.has(task.branchId);
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
