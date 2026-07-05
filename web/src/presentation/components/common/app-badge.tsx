import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Priority, TaskStatus } from '../../../domain/entities/enums';
import { cn } from '../../../core/utils/formatters';

const statusKeyMap: Record<TaskStatus, 'todo' | 'inProgress' | 'done' | 'cancelled'> = {
  [TaskStatus.todo]: 'todo',
  [TaskStatus.inProgress]: 'inProgress',
  [TaskStatus.done]: 'done',
  [TaskStatus.cancelled]: 'cancelled',
};

const priorityKeyMap: Record<Priority, 'low' | 'medium' | 'high'> = {
  [Priority.low]: 'low',
  [Priority.medium]: 'medium',
  [Priority.high]: 'high',
};

const badgeVariants = cva(
  'inline-flex items-center gap-micro rounded-pill px-xs py-micro font-mono text-mono-sm font-medium',
  {
    variants: {
      variant: {
        status:
          'bg-status-todo/10 text-status-todo',
        priority:
          'bg-priority-medium/10 text-priority-medium',
        count:
          'bg-surface-2 text-ink-muted',
        success:
          'bg-success/10 text-success',
        warning:
          'bg-warning/10 text-warning',
        error:
          'bg-error/10 text-error',
        info:
          'bg-info/10 text-info',
      },
      status: {
        todo: 'bg-status-todo/10 text-status-todo',
        inProgress: 'bg-status-in-progress/10 text-status-in-progress',
        done: 'bg-status-done/10 text-status-done',
        cancelled: 'bg-status-cancelled/10 text-status-cancelled',
      },
      priority: {
        low: 'bg-priority-low/10 text-priority-low',
        medium: 'bg-priority-medium/10 text-priority-medium',
        high: 'bg-priority-high/10 text-priority-high',
      },
    },
    defaultVariants: {
      variant: 'status',
    },
  }
);

export interface AppBadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'status' | 'priority'>,
    Omit<VariantProps<typeof badgeVariants>, 'status' | 'priority'> {
  status?: TaskStatus | 'todo' | 'inProgress' | 'done' | 'cancelled';
  priority?: Priority | 'low' | 'medium' | 'high';
  children: React.ReactNode;
}

const AppBadge = React.forwardRef<HTMLSpanElement, AppBadgeProps>(
  ({ className, variant, status, priority, children, ...props }, ref) => {
    const mappedStatus =
      status !== undefined && typeof status === 'number'
        ? statusKeyMap[status]
        : (status as VariantProps<typeof badgeVariants>['status']);
    const mappedPriority =
      priority !== undefined && typeof priority === 'number'
        ? priorityKeyMap[priority]
        : (priority as VariantProps<typeof badgeVariants>['priority']);
    return (
      <span
        ref={ref}
        className={cn(
          badgeVariants({ variant, status: mappedStatus, priority: mappedPriority, className })
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);
AppBadge.displayName = 'AppBadge';

export { AppBadge, badgeVariants };
