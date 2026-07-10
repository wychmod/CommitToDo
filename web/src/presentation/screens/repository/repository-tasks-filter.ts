import { Commit } from '@/domain/entities/commit';
import { TaskStatus } from '@/domain/entities/enums';
import { Task } from '@/domain/entities/task';
import { Branch } from '@/domain/entities/branch';
import {
  DueDateFilterKey,
  StatusCounts,
  StatusFilterKey,
  TaskSortKey,
} from './repository-tasks-types';
import { isOverdue, isSameDay, isThisWeek } from './repository-tasks-formatters';

export function matchesStatusFilter(task: Task, filter: StatusFilterKey): boolean {
  if (filter === 'all') return true;
  if (filter === 'today') {
    if (!task.dueDate) return false;
    return isSameDay(task.dueDate, new Date());
  }
  return task.status === filter;
}

export function matchesDueDateFilter(task: Task, filter: DueDateFilterKey): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'today':
      return task.dueDate ? isSameDay(task.dueDate, new Date()) : false;
    case 'week':
      return task.dueDate ? isThisWeek(task.dueDate) : false;
    case 'overdue':
      return task.dueDate ? isOverdue(task.dueDate) && !task.isCompleted : false;
    case 'none':
      return task.dueDate === null;
    default:
      return true;
  }
}

export function matchesSearch(task: Task, query: string, branchName: string): boolean {
  if (!query.trim()) return true;
  const lower = query.trim().toLowerCase();
  return (
    task.title.toLowerCase().includes(lower) ||
    (task.description?.toLowerCase().includes(lower) ?? false) ||
    branchName.toLowerCase().includes(lower)
  );
}

export function getStatusCounts(tasks: Task[]): StatusCounts {
  const today = new Date();
  return {
    all: tasks.length,
    today: tasks.filter((t) => t.dueDate && isSameDay(t.dueDate, today)).length,
    todo: tasks.filter((t) => t.status === TaskStatus.todo).length,
    inProgress: tasks.filter((t) => t.status === TaskStatus.inProgress).length,
    done: tasks.filter((t) => t.status === TaskStatus.done).length,
    cancelled: tasks.filter((t) => t.status === TaskStatus.cancelled).length,
    uncommitted: tasks.filter((t) => t.status === TaskStatus.done).length,
  };
}

export function getBranchTaskCounts(
  allTasks: Task[],
  branches: Branch[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const branch of branches) {
    counts[branch.id] = allTasks.filter((t) => t.branchId === branch.id).length;
  }
  return counts;
}

export function sortTasks(tasks: Task[], sort: TaskSortKey): Task[] {
  const sorted = [...tasks];
  switch (sort) {
    case 'updatedAt':
      sorted.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      break;
    case 'createdAt':
      sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      break;
    case 'dueDate': {
      const dueWeight = (t: Task): number => {
        if (!t.dueDate) return Number.MAX_SAFE_INTEGER;
        if (isOverdue(t.dueDate) && !t.isCompleted) return -1;
        if (isSameDay(t.dueDate, new Date())) return 0;
        return t.dueDate.getTime();
      };
      sorted.sort((a, b) => dueWeight(a) - dueWeight(b));
      break;
    }
    case 'priority':
      sorted.sort((a, b) => b.priority - a.priority);
      break;
  }
  return sorted;
}

export function findCommitForTask(
  taskId: string,
  commits: Commit[]
): Commit | undefined {
  return commits.find((c) => c.taskId === taskId);
}
