import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Calendar, CheckCircle2, Circle, GitBranch, Trash2, X } from 'lucide-react';

import { cn } from '@/core/utils/formatters';
import { formatDateTime, formatRelativeTime } from '@/core/utils/formatters';
import { Priority, TaskStatus } from '@/domain/entities/enums';
import { Task } from '@/domain/entities/task';
import { Branch } from '@/domain/entities/branch';
import { Repository } from '@/domain/entities/repository';
import { Commit } from '@/domain/entities/commit';
import { V3Button } from '@/presentation/components/v3/v3-button';

export interface WorkspaceTaskDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  repository: Repository | null;
  branch: Branch | null;
  commits: Commit[];
  onComplete: () => void;
  onDelete?: () => void;
}

function priorityClasses(priority: Priority): string {
  switch (priority) {
    case Priority.high:
      return 'bg-[var(--v3-danger-soft)] text-[var(--v3-danger)]';
    case Priority.low:
      return 'bg-[var(--v3-primary-soft)] text-[var(--v3-primary)]';
    case Priority.medium:
    default:
      return 'bg-[var(--v3-warning-soft)] text-[var(--v3-warning)]';
  }
}

function statusClasses(status: TaskStatus): string {
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

export function WorkspaceTaskDetail({
  open,
  onOpenChange,
  task,
  repository,
  branch,
  commits,
  onComplete,
  onDelete,
}: WorkspaceTaskDetailProps): JSX.Element {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-label="任务详情"
          className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[440px] flex-col border-l border-[var(--v3-border)] bg-[var(--v3-card)] p-6 shadow-[var(--v3-shadow-panel)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
        >
          {!task ? (
            <div className="flex flex-1 flex-col items-center justify-center text-[var(--v3-text-muted)]">
              任务不存在或已被删除。
            </div>
          ) : (
            <>
              <header className="mb-6 flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--v3-primary)]">
                    TASK DETAIL
                  </span>
                  <DialogPrimitive.Title className="mt-1 text-[22px] font-semibold leading-[1.25] text-[var(--v3-text-strong)]">
                    {task.title}
                  </DialogPrimitive.Title>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'rounded-[var(--v3-radius-sm)] px-2 py-0.5 text-[12px] font-medium',
                        task.isOverdue && task.status === TaskStatus.todo
                          ? 'bg-[var(--v3-danger-soft)] text-[var(--v3-danger)]'
                          : statusClasses(task.status)
                      )}
                    >
                      {task.isOverdue && task.status === TaskStatus.todo
                        ? '逾期'
                        : TaskStatus.label(task.status)}
                    </span>
                    <span
                      className={cn(
                        'rounded-[var(--v3-radius-sm)] px-2 py-0.5 text-[12px] font-medium',
                        priorityClasses(task.priority)
                      )}
                    >
                      优先级 · {Priority.label(task.priority)}
                    </span>
                    {repository ? (
                      <span className="flex items-center gap-1 text-[12px] text-[var(--v3-text-muted)]">
                        <GitBranch size={12} strokeWidth={1.5} aria-hidden="true" />
                        {repository.name}
                        {branch ? ` / ${branch.name}` : ''}
                      </span>
                    ) : null}
                  </div>
                </div>
                <DialogPrimitive.Close asChild>
                  <button
                    type="button"
                    aria-label="关闭"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--v3-radius-md)] text-[var(--v3-text-muted)] transition-colors hover:bg-[var(--v3-control)] hover:text-[var(--v3-text-strong)] focus-visible:outline-none focus-visible:[box-shadow:var(--v3-focus-ring)]"
                  >
                    <X size={18} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </DialogPrimitive.Close>
              </header>

              <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
                <section className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-medium text-[var(--v3-text-muted)]">
                    描述
                  </span>
                  <p className="whitespace-pre-wrap text-[14px] text-[var(--v3-text)]">
                    {task.description || (
                      <span className="text-[var(--v3-text-muted)]">暂无描述</span>
                    )}
                  </p>
                </section>

                <section className="flex flex-col gap-2">
                  <span className="text-[12px] font-medium text-[var(--v3-text-muted)]">
                    属性
                  </span>
                  <div className="flex flex-col gap-2 rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] p-3">
                    <div className="flex items-center gap-2 text-[13px]">
                      <Calendar size={14} strokeWidth={1.5} className="text-[var(--v3-text-muted)]" aria-hidden="true" />
                      <span className="text-[var(--v3-text-muted)]">截止日期</span>
                      <span className="ml-auto text-[var(--v3-text-strong)]">
                        {task.dueDate ? formatDateTime(task.dueDate) : '未设置'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[13px]">
                      <CheckCircle2 size={14} strokeWidth={1.5} className="text-[var(--v3-text-muted)]" aria-hidden="true" />
                      <span className="text-[var(--v3-text-muted)]">完成于</span>
                      <span className="ml-auto text-[var(--v3-text-strong)]">
                        {task.completedAt ? formatDateTime(task.completedAt) : '未完成'}
                      </span>
                    </div>
                  </div>
                </section>

                <section className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium text-[var(--v3-text-muted)]">
                      提交记录
                    </span>
                    <span className="font-mono text-[11px] text-[var(--v3-text-muted)]">
                      {commits.length}
                    </span>
                  </div>
                  {commits.length === 0 ? (
                    <p className="text-[13px] text-[var(--v3-text-muted)]">暂无提交记录</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {commits.map((commit) => (
                        <li
                          key={commit.id}
                          className="flex items-center gap-2 rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] p-2 text-[13px]"
                        >
                          <Circle size={12} strokeWidth={1.5} className="text-[var(--v3-text-muted)]" aria-hidden="true" />
                          <span className="flex-1 truncate text-[var(--v3-text)]">{commit.message}</span>
                          <span className="font-mono text-[11px] text-[var(--v3-text-muted)]">
                            {formatRelativeTime(commit.createdAt)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              <footer className="mt-6 flex justify-end gap-3">
                <V3Button
                  type="button"
                  variant="secondary"
                  onClick={onComplete}
                >
                  {task.isCompleted ? '恢复为待办' : '标记为已完成'}
                </V3Button>
                {onDelete ? (
                  <V3Button
                    type="button"
                    variant="secondary"
                    onClick={onDelete}
                    className="border-[var(--v3-danger)] text-[var(--v3-danger)] hover:bg-[var(--v3-danger-soft)]"
                  >
                    <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
                    删除
                  </V3Button>
                ) : null}
              </footer>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
