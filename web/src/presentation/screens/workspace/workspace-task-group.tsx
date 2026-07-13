import { Calendar, Flag } from 'lucide-react';
import { isSameDay, isTomorrow, isYesterday, format } from 'date-fns';
import { Link } from 'react-router-dom';

import { cn } from '@/core/utils/formatters';
import { Priority, TaskStatus } from '@/domain/entities/enums';
import { Task } from '@/domain/entities/task';
import type { TaskGroup } from '@/presentation/stores/today-workspace-store';

export interface WorkspaceTaskGroupProps {
  group: TaskGroup;
  onTaskClick: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
}

function formatTaskDue(date: Date): string {
  const now = new Date();
  if (isSameDay(date, now)) return `今天 ${format(date, 'HH:mm')}`;
  if (isTomorrow(date)) return `明天 ${format(date, 'HH:mm')}`;
  if (isYesterday(date)) return `昨天 ${format(date, 'HH:mm')}`;
  return format(date, 'M 月 d 日');
}

function branchColorClass(name: string): string {
  if (name === 'main') return 'text-[var(--v3-primary)]';
  if (name === 'launch') return 'text-[var(--v3-launch)]';
  if (name === 'design') return 'text-[var(--v3-design)]';
  return 'text-[var(--v3-text-muted)]';
}

function priorityColor(priority: Priority): string {
  switch (priority) {
    case Priority.high:
      return 'text-[var(--v3-danger)]';
    case Priority.medium:
      return 'text-[var(--v3-warning)]';
    case Priority.low:
    default:
      return 'text-[var(--v3-primary)]';
  }
}

function priorityLabel(priority: Priority): string {
  switch (priority) {
    case Priority.high:
      return '高优先级';
    case Priority.low:
      return '低优先级';
    case Priority.medium:
    default:
      return '中优先级';
  }
}

function statusChipClasses(status: TaskStatus, overdue: boolean): string {
  if (overdue && status === TaskStatus.todo) {
    return 'bg-[var(--v3-danger-soft)] text-[var(--v3-danger)]';
  }
  switch (status) {
    case TaskStatus.done:
      return 'bg-[var(--v3-primary-soft)] text-[var(--v3-primary)]';
    case TaskStatus.inProgress:
      return 'bg-[var(--v3-launch-soft)] text-[var(--v3-launch)]';
    case TaskStatus.cancelled:
      return 'bg-[var(--v3-control)] text-[var(--v3-text-muted)]';
    case TaskStatus.todo:
    default:
      return 'bg-[var(--v3-control)] text-[var(--v3-text-secondary)]';
  }
}

function statusLabel(status: TaskStatus, overdue: boolean): string {
  if (overdue && status === TaskStatus.todo) return '逾期';
  return TaskStatus.label(status);
}

export function WorkspaceTaskGroup({
  group,
  onTaskClick,
  onToggleComplete,
}: WorkspaceTaskGroupProps): JSX.Element {
  const { repository, branch, tasks } = group;

  return (
    <section aria-label={`${repository.name} / ${branch.name}`}>
      <header className="mb-3 flex items-baseline gap-2">
        <Link
          to={`/repository/${repository.id}`}
          className="text-[18px] font-semibold text-[var(--v3-text-strong)] hover:underline"
        >
          {repository.name}
        </Link>
        <span className="text-[var(--v3-text-muted)]">/</span>
        <Link
          to={`/repository/${repository.id}/tasks?branch=${branch.id}`}
          className={cn(
            'font-mono text-[13px] hover:underline',
            branchColorClass(branch.name)
          )}
        >
          {branch.name}
        </Link>
      </header>

      <ul className="flex flex-col" role="list">
        {tasks.map((task) => {
          const completed = task.isCompleted;
          const overdue = !completed && task.isOverdue;
          return (
            <li
              key={task.id}
              className="group flex min-h-[48px] cursor-pointer items-center gap-3 border-b border-[var(--v3-divider)] py-2 transition-colors hover:bg-[var(--v3-control)]"
              onClick={() => onTaskClick(task)}
              role="listitem"
            >
              <label
                className="flex shrink-0 cursor-pointer items-center"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={completed}
                  onChange={() => onToggleComplete(task)}
                  className={cn(
                    'h-[18px] w-[18px] appearance-none rounded-[3px] border transition-colors',
                    completed
                      ? 'border-[var(--v3-primary)] bg-[var(--v3-primary)]'
                      : overdue
                        ? 'border-[var(--v3-danger)] bg-transparent'
                        : 'border-[var(--v3-text-muted)] bg-transparent',
                    'checked:bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23061008\' stroke-width=\'3\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'20 6 9 17 4 12\'/%3E%3C/svg%3E")]'
                  )}
                  aria-label={completed ? '标记为未完成' : '标记为已完成'}
                />
              </label>

              <span
                className={cn(
                  'flex-1 truncate text-[16px]',
                  completed
                    ? 'text-[var(--v3-text-muted)] line-through'
                    : 'text-[var(--v3-text-strong)]'
                )}
              >
                {task.title}
              </span>

              <div className="flex items-center gap-4 text-[13px]">
                {task.dueDate ? (
                  <span className="flex items-center gap-1 text-[var(--v3-text-muted)]">
                    <Calendar size={14} strokeWidth={1.5} aria-hidden="true" />
                    {formatTaskDue(task.dueDate)}
                  </span>
                ) : null}

                <span
                  className={cn(
                    'flex items-center gap-1',
                    priorityColor(task.priority)
                  )}
                >
                  <Flag size={14} strokeWidth={1.5} aria-hidden="true" />
                  {priorityLabel(task.priority)}
                </span>

                <span
                  className={cn(
                    'flex h-6 items-center rounded-[var(--v3-radius-sm)] px-2 text-[12px] font-medium',
                    statusChipClasses(task.status, overdue)
                  )}
                >
                  {statusLabel(task.status, overdue)}
                </span>

                <span className="flex h-6 w-7 items-center justify-center rounded-[var(--v3-radius-sm)] bg-[var(--v3-control)] text-[12px] text-[var(--v3-text-secondary)]">
                  我
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
