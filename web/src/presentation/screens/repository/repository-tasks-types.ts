import { Priority, TaskStatus } from '@/domain/entities/enums';

export type StatusFilterKey = 'all' | 'today' | TaskStatus;

export type DueDateFilterKey = 'all' | 'today' | 'week' | 'overdue' | 'none';

export type TaskSortKey = 'updatedAt' | 'dueDate' | 'priority' | 'createdAt';

export interface StatusCounts {
  all: number;
  today: number;
  todo: number;
  inProgress: number;
  done: number;
  cancelled: number;
  uncommitted: number;
}

export const priorityOptions: { value: Priority; label: string }[] = [
  { value: Priority.high, label: '高' },
  { value: Priority.medium, label: '中' },
  { value: Priority.low, label: '低' },
];

export const statusFilterOptions: { value: StatusFilterKey; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'today', label: '今天' },
  { value: TaskStatus.todo, label: '待办' },
  { value: TaskStatus.inProgress, label: '进行中' },
  { value: TaskStatus.done, label: '已完成' },
  { value: TaskStatus.cancelled, label: '已取消' },
];

export const dueDateFilterOptions: { value: DueDateFilterKey; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'today', label: '今天' },
  { value: 'week', label: '本周' },
  { value: 'overdue', label: '逾期' },
  { value: 'none', label: '无截止日期' },
];

export const sortOptions: { value: TaskSortKey; label: string }[] = [
  { value: 'updatedAt', label: '按更新时间' },
  { value: 'dueDate', label: '按截止日期' },
  { value: 'priority', label: '按优先级' },
  { value: 'createdAt', label: '按创建时间' },
];
