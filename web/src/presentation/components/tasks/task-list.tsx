import { CheckCircle2, Circle } from 'lucide-react';
import { Priority, TaskStatus } from '../../../domain/entities/enums';
import { Task } from '../../../domain/entities/task';
import { formatDate } from '../../../core/utils/formatters';
import { cn } from '../../../core/utils/formatters';

export interface TaskListProps {
  tasks: Task[];
  selectedTaskId?: string | null;
  branchName?: string | null;
  onItemClick?: (task: Task) => void;
  onToggleComplete?: (task: Task) => void;
}

/**
 * High-density, enterprise-style task list (used inside the repository work
 * surface and inside the global workspace). One row = one task, with stable
 * columns so users can scan long lists without losing their place.
 */
export function TaskList({
  tasks,
  selectedTaskId,
  branchName,
  onItemClick,
  onToggleComplete,
}: TaskListProps): JSX.Element {
  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-state-title">还没有任务</span>
        <span className="empty-state-caption">
          从右上角「新建」创建一个任务，或从目标里拆出一个分支开始。
        </span>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="task-row" role="row">
        <span aria-hidden className="h-4 w-4" />
        <span className="task-row-cell-meta" role="columnheader">
          任务
        </span>
        <span className="task-row-cell-meta" role="columnheader">
          状态
        </span>
        <span className="task-row-cell-meta" role="columnheader">
          优先级
        </span>
        <span className="task-row-cell-meta task-row-cell-branch" role="columnheader">
          分支
        </span>
        <span className="task-row-cell-meta task-row-cell-due" role="columnheader">
          截止
        </span>
      </div>
      {tasks.map((task) => {
        const isCompleted = task.status === TaskStatus.done;
        const tone: 'todo' | 'inProgress' | 'done' | 'archived' =
          task.status === TaskStatus.done
            ? 'done'
            : task.status === TaskStatus.inProgress
              ? 'inProgress'
              : task.status === TaskStatus.cancelled
                ? 'archived'
                : 'todo';
        return (
          <div
            key={task.id}
            className="task-row"
            role="row"
            data-selected={task.id === selectedTaskId ? 'true' : 'false'}
            data-priority={task.priority + 1}
            tabIndex={0}
            onClick={() => onItemClick?.(task)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onItemClick?.(task);
              }
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleComplete?.(task);
              }}
              aria-label={isCompleted ? '标记为未完成' : '标记为已完成'}
              className="task-row-check"
              data-checked={isCompleted}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-3 w-3" aria-hidden />
              ) : (
                <Circle className="h-3 w-3" aria-hidden />
              )}
            </button>
            <span className="task-row-title" data-done={isCompleted}>
              {task.title}
            </span>
            <span className="task-row-cell">
              <span className={cn('status-pill')} data-tone={tone}>
                {TaskStatus.label(task.status)}
              </span>
            </span>
            <span className="task-row-cell">{Priority.label(task.priority)}</span>
            <span className="task-row-cell task-row-cell-branch font-mono text-[11px] text-ink-muted">
              {branchName ?? '—'}
            </span>
            <span className="task-row-cell task-row-cell-due">
              {task.dueDate ? formatDate(task.dueDate) : '—'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
