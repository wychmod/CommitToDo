import { CheckCircle2, Circle } from 'lucide-react';

import { cn } from '@/core/utils/formatters';
import { Priority, TaskStatus } from '@/domain/entities/enums';
import { Task } from '@/domain/entities/task';
import { formatTaskDueDate, formatTaskUpdatedAt } from './repository-tasks-formatters';

export interface TaskTableRowProps {
  task: Task;
  branchName: string;
  selected: boolean;
  onSelect: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
}

const priorityMeta: Record<Priority, { label: string; color: string }> = {
  [Priority.high]: { label: '高', color: 'var(--v3-danger)' },
  [Priority.medium]: { label: '中', color: 'var(--v3-warning)' },
  [Priority.low]: { label: '低', color: 'var(--v3-primary)' },
};

export function TaskTableRow({
  task,
  branchName,
  selected,
  onSelect,
  onToggleComplete,
}: TaskTableRowProps): JSX.Element {
  const isCompleted = task.status === TaskStatus.done || task.status === TaskStatus.cancelled;
  const priority = priorityMeta[task.priority];

  return (
    <div
      role="row"
      aria-selected={selected}
      onClick={() => onSelect(task)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(task);
        }
      }}
      tabIndex={0}
      className={cn(
        'group relative grid h-[53px] cursor-pointer grid-cols-[42px_1fr_105px_105px_90px_110px_110px] items-center gap-2 px-3 text-[14px] outline-none transition-colors duration-[var(--v3-fast)] focus-visible:[box-shadow:var(--v3-focus-ring)]',
        selected
          ? 'bg-[var(--v3-primary-soft)] text-[var(--v3-text-strong)]'
          : 'text-[var(--v3-text)] hover:bg-[var(--v3-control)]'
      )}
    >
      {selected ? (
        <span
          className="absolute left-0 top-0 h-full w-[3px] bg-[var(--v3-primary)]"
          aria-hidden="true"
        />
      ) : null}

      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete(task);
          }}
          aria-label={isCompleted ? '标记为未完成' : '标记为已完成'}
          className={cn(
            'flex h-[18px] w-[18px] items-center justify-center rounded-[3px] border transition-colors duration-[var(--v3-fast)]',
            isCompleted
              ? 'border-[var(--v3-primary)] bg-[var(--v3-primary)] text-[var(--v3-text-on-primary)]'
              : 'border-[var(--v3-border)] bg-transparent text-[var(--v3-text-muted)] hover:border-[var(--v3-primary)]'
          )}
        >
          {isCompleted ? (
            <CheckCircle2 size={12} strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <Circle size={12} strokeWidth={1.5} aria-hidden="true" />
          )}
        </button>
      </div>

      <div className="flex min-w-0 flex-col justify-center">
        <span className={cn('truncate', isCompleted && 'text-[var(--v3-text-secondary)] line-through')}>
          {task.title}
        </span>
        {task.description ? (
          <span className="truncate text-[12px] text-[var(--v3-text-muted)]">{task.description}</span>
        ) : null}
      </div>

      <div className="flex items-center">
        <StatusChip status={task.status} />
      </div>

      <div className="flex items-center gap-1.5">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: priority.color }}
          aria-hidden="true"
        />
        <span className="text-[13px]">{priority.label}</span>
      </div>

      <div className="font-mono text-[13px] text-[var(--v3-launch)]">{branchName}</div>

      <div className={cn('text-right text-[13px]', task.isOverdue && 'text-[var(--v3-danger)]')}>
        {formatTaskDueDate(task.dueDate)}
      </div>

      <div className="text-right text-[13px] text-[var(--v3-text-muted)]">
        {formatTaskUpdatedAt(task.updatedAt)}
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: TaskStatus }): JSX.Element {
  switch (status) {
    case TaskStatus.todo:
      return (
        <span className="inline-flex h-6 items-center rounded-[var(--v3-radius-sm)] bg-[var(--v3-control)] px-2 text-[12px] text-[var(--v3-text-secondary)]">
          待办
        </span>
      );
    case TaskStatus.inProgress:
      return (
        <span className="inline-flex h-6 items-center rounded-[var(--v3-radius-sm)] bg-[var(--v3-control)] px-2 text-[12px] text-[var(--v3-warning)]">
          进行中
        </span>
      );
    case TaskStatus.done:
      return (
        <span className="inline-flex h-6 items-center rounded-[var(--v3-radius-sm)] bg-[var(--v3-primary-soft)] px-2 text-[12px] text-[var(--v3-primary)]">
          已完成
        </span>
      );
    case TaskStatus.cancelled:
      return (
        <span className="inline-flex h-6 items-center rounded-[var(--v3-radius-sm)] bg-[var(--v3-control)] px-2 text-[12px] text-[var(--v3-text-muted)]">
          已取消
        </span>
      );
  }
}
