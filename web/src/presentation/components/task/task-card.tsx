import { CheckCircle2, Circle } from 'lucide-react';
import { Priority, TaskStatus } from '../../../domain/entities/enums';
import { Task } from '../../../domain/entities/task';
import { formatDate } from '../../../core/utils/formatters';
import { AppBadge } from '../common/app-badge';

export interface TaskCardProps {
  task: Task;
  selected?: boolean;
  onClick?: () => void;
  onToggleComplete?: () => void;
}

const priorityDotColor: Record<Priority, string> = {
  [Priority.low]: 'bg-priority-low',
  [Priority.medium]: 'bg-priority-medium',
  [Priority.high]: 'bg-priority-high',
};

export function TaskCard({
  task,
  selected = false,
  onClick,
  onToggleComplete,
}: TaskCardProps): JSX.Element {
  const isCompleted = task.status === TaskStatus.done;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick?.();
      }}
      className={`group relative flex cursor-pointer items-center gap-xs rounded-lg border p-md transition-colors ${
        selected
          ? 'border-hairline-strong bg-surface-2'
          : 'border-hairline bg-surface-1 hover:bg-surface-2'
      }`}
    >
      <span
        className={`absolute left-0 top-1/2 h-10 w-[3px] -translate-y-1/2 rounded-r-full ${priorityDotColor[task.priority]}`}
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete?.();
        }}
        className="ml-xs flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-ink-subtle transition-colors hover:bg-surface-3 hover:text-ink"
        aria-label={isCompleted ? '标记为未完成' : '标记为已完成'}
      >
        {isCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-status-done" />
        ) : (
          <Circle className="h-5 w-5" />
        )}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-micro">
        <span
          className={`truncate text-card-title font-medium ${
            isCompleted ? 'text-ink-subtle line-through' : 'text-ink'
          }`}
        >
          {task.title}
        </span>
        <div className="flex items-center gap-xs text-mono-sm text-ink-muted">
          {task.dueDate ? <span>截止 {formatDate(task.dueDate)}</span> : null}
          <AppBadge status={task.status}>
            {TaskStatus.label(task.status)}
          </AppBadge>
        </div>
      </div>
    </div>
  );
}
