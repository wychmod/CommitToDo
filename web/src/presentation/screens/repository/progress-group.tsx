import * as React from 'react';
import { Check, ChevronRight, Circle } from 'lucide-react';

import { Branch } from '@/domain/entities/branch';
import { Priority, TaskStatus } from '@/domain/entities/enums';
import { Task } from '@/domain/entities/task';
import { formatRelativeTime } from '@/core/utils/formatters';
import { getBranchColorToken } from './repository-overview-helpers';

export interface ProgressGroupProps {
  branch: Branch;
  tasks: Task[];
  totalCount: number;
  onTaskClick: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
}

export function ProgressGroup({
  branch,
  tasks,
  totalCount,
  onTaskClick,
  onToggleComplete,
}: ProgressGroupProps): JSX.Element {
  const color = getBranchColorToken(branch);

  return (
    <article className="flex flex-col gap-3">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-5 w-[2px] rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
          <span
            className="font-mono text-[14px] font-medium"
            style={{ color }}
          >
            {branch.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-[var(--v3-text-muted)]">
            {totalCount} 个任务
          </span>
          <button
            type="button"
            className="inline-flex h-6 w-6 items-center justify-center rounded-[var(--v3-radius-sm)] text-[var(--v3-text-muted)] transition-colors hover:bg-[var(--v3-control)] hover:text-[var(--v3-text)]"
            aria-label={`折叠 ${branch.name} 任务`}
          >
            <ChevronRight
              size={16}
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </button>
        </div>
      </header>

      <div className="overflow-hidden rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-card)]">
        {tasks.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <span className="block text-[14px] text-[var(--v3-text-secondary)]">
              {branch.name} 暂无任务
            </span>
            <span className="mt-1 block text-[12px] text-[var(--v3-text-muted)]">
              给这个分支添加第一条任务。
            </span>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              color={color}
              onClick={() => onTaskClick(task)}
              onToggleComplete={() => onToggleComplete(task)}
            />
          ))
        )}
      </div>
    </article>
  );
}

interface TaskRowProps {
  task: Task;
  color: string;
  onClick: () => void;
  onToggleComplete: () => void;
}

function TaskRow({
  task,
  color,
  onClick,
  onToggleComplete,
}: TaskRowProps): JSX.Element {
  const isCompleted = task.status === TaskStatus.done;
  const priorityLabel = `${Priority.label(task.priority)}优先级`;

  let statusLabel: string;
  switch (task.status) {
    case TaskStatus.todo:
      statusLabel = '待办';
      break;
    case TaskStatus.inProgress:
      statusLabel = '进行中';
      break;
    case TaskStatus.done:
      statusLabel = '已完成';
      break;
    case TaskStatus.cancelled:
      statusLabel = '已取消';
      break;
    default:
      statusLabel = '待办';
  }

  const statusTone =
    task.status === TaskStatus.done
      ? 'done'
      : task.status === TaskStatus.inProgress
        ? 'inProgress'
        : task.status === TaskStatus.cancelled
          ? 'cancelled'
          : 'todo';

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 border-b border-[var(--v3-border-soft)] px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-[var(--v3-card-hover)]"
    >
      <span
        className="h-4 w-4 flex-shrink-0 cursor-pointer rounded-full border transition-colors"
        style={{
          borderColor: isCompleted ? color : 'var(--v3-border)',
          backgroundColor: isCompleted ? color : 'transparent',
        }}
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete();
        }}
        role="checkbox"
        aria-checked={isCompleted}
        aria-label={isCompleted ? '标记为未完成' : '标记为已完成'}
      >
        {isCompleted ? (
          <Check
            size={14}
            strokeWidth={2}
            aria-hidden="true"
            className="text-[var(--v3-text-on-primary)]"
          />
        ) : (
          <Circle
            size={14}
            strokeWidth={1.5}
            aria-hidden="true"
            className="text-transparent group-hover:text-[var(--v3-text-muted)]"
          />
        )}
      </span>

      <span
        className="flex-1 truncate text-[15px] text-[var(--v3-text-strong)]"
        data-done={isCompleted}
        style={
          isCompleted
            ? { textDecoration: 'line-through', color: 'var(--v3-text-muted)' }
            : undefined
        }
      >
        {task.title}
      </span>

      <span
        className="hidden w-[62px] flex-shrink-0 rounded-full px-2 py-0.5 text-center text-[12px] tablet:block"
        data-tone={statusTone}
        style={statusPillStyle(statusTone)}
      >
        {statusLabel}
      </span>

      <span
        className="hidden w-[78px] flex-shrink-0 rounded-full px-2 py-0.5 text-center text-[12px] tablet:block"
        data-priority={task.priority}
        style={priorityPillStyle(task.priority)}
      >
        {priorityLabel}
      </span>

      <span className="flex-shrink-0 text-[13px] text-[var(--v3-text-muted)]">
        {task.updatedAt ? formatRelativeTime(task.updatedAt) : '—'}
      </span>
    </button>
  );
}

function statusPillStyle(tone: string): React.CSSProperties {
  switch (tone) {
    case 'done':
      return {
        backgroundColor: 'var(--v3-primary-soft)',
        color: 'var(--v3-primary)',
      };
    case 'inProgress':
      return {
        backgroundColor: 'rgb(89 203 208 / 12%)',
        color: 'var(--v3-launch)',
      };
    case 'cancelled':
      return {
        backgroundColor: 'rgb(230 99 91 / 12%)',
        color: 'var(--v3-danger)',
      };
    default:
      return {
        backgroundColor: 'var(--v3-control)',
        color: 'var(--v3-text-secondary)',
      };
  }
}

function priorityPillStyle(priority: Priority): React.CSSProperties {
  switch (priority) {
    case Priority.high:
      return {
        backgroundColor: 'rgb(230 99 91 / 12%)',
        color: 'var(--v3-danger)',
      };
    case Priority.low:
      return {
        backgroundColor: 'var(--v3-control)',
        color: 'var(--v3-text-secondary)',
      };
    default:
      return {
        backgroundColor: 'rgb(89 203 208 / 12%)',
        color: 'var(--v3-launch)',
      };
  }
}
