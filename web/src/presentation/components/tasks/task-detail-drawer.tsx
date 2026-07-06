import {
  CheckCircle2,
  Circle,
  Edit3,
  GitBranch,
  GitCommit,
  Calendar,
  Loader2,
  Trash2,
  X,
} from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useNavigate } from 'react-router-dom';
import { CommitType, Priority, TaskStatus } from '../../../domain/entities/enums';
import { formatDateTime, formatRelativeTime } from '../../../core/utils/formatters';
import { Commit } from '../../../domain/entities/commit';
import { Task } from '../../../domain/entities/task';

export interface TaskDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  commits: Commit[];
  isLoading?: boolean;
  /** Branch name (and repo name) for header context — optional */
  branchName?: string | null;
  repositoryName?: string | null;
  errorMessage?: string | null;
  onComplete?: () => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  onEdit?: (taskId: string) => void;
}

/**
 * Right-side detail drawer for a task. Replaces the old full-page TaskDetail
 * screen — the design rule is that users should never leave the task list to
 * inspect a task. Renders inside a Radix Dialog so Esc / overlay-click close
 * just works.
 */
export function TaskDetailDrawer({
  open,
  onOpenChange,
  task,
  commits,
  isLoading = false,
  branchName,
  repositoryName,
  errorMessage,
  onComplete,
  onDelete,
  onEdit,
}: TaskDetailDrawerProps): JSX.Element {
  const navigate = useNavigate();

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-overlay data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 tablet:hidden" />
        <DialogPrimitive.Content
          aria-label="任务详情"
          className="detail-drawer fixed inset-y-0 right-0 z-40 w-full max-w-[440px] bg-canvas-elevated data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right tablet:static tablet:z-0 tablet:animate-none tablet:bg-transparent"
        >
          {isLoading && !task ? (
            <div className="flex items-center gap-2 p-6 text-ink-muted">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              <span>正在加载任务…</span>
            </div>
          ) : !task ? (
            <div className="flex flex-col items-center justify-center gap-3 p-8 text-center text-ink-muted">
              <p className="text-sm">任务不存在或已被删除。</p>
              <DialogPrimitive.Close className="text-xs text-primary underline">
                关闭
              </DialogPrimitive.Close>
            </div>
          ) : (
            <>
              <header className="drawer-header">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-subtle">
                    任务详情
                  </span>
                  <h2 className="drawer-title">{task.title}</h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <StatusPill status={task.status} />
                    <PriorityPill priority={task.priority} />
                    {repositoryName ? (
                      <span className="drawer-list-meta">
                        <GitBranch className="mr-1 inline h-3 w-3" aria-hidden />
                        {repositoryName}
                        {branchName ? ` / ${branchName}` : ''}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <DrawerIconButton
                    icon={Edit3}
                    label="编辑任务"
                    onClick={() => onEdit?.(task.id)}
                  />
                  <DrawerIconButton
                    icon={task.status === TaskStatus.done ? CheckCircle2 : Circle}
                    label={task.status === TaskStatus.done ? '标记为未完成' : '标记为完成'}
                    onClick={onComplete}
                  />
                  <DrawerIconButton
                    icon={Trash2}
                    label="删除任务"
                    tone="danger"
                    onClick={onDelete}
                  />
                  <DialogPrimitive.Close asChild>
                    <button
                      type="button"
                      aria-label="关闭详情"
                      className="topbar-icon-btn border border-border-strong"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </DialogPrimitive.Close>
                </div>
              </header>

              <div className="drawer-body">
                {errorMessage ? (
                  <div className="rounded-md border border-error bg-error-soft p-md text-body-sm text-error">
                    {errorMessage}
                  </div>
                ) : null}

                <section className="drawer-section">
                  <span className="drawer-label">描述</span>
                  {task.description ? (
                    <p className="drawer-value whitespace-pre-wrap">{task.description}</p>
                  ) : (
                    <p className="drawer-value text-ink-subtle">暂无描述</p>
                  )}
                </section>

                <section className="drawer-section">
                  <span className="drawer-label">属性</span>
                  <div className="drawer-list">
                    <DrawerListItem
                      icon={Calendar}
                      label="截止日期"
                      value={task.dueDate ? formatDateTime(task.dueDate) : '未设置'}
                    />
                    <DrawerListItem
                      icon={CheckCircle2}
                      label="完成于"
                      value={
                        task.completedAt ? formatDateTime(task.completedAt) : '未完成'
                      }
                    />
                    <DrawerListItem
                      icon={GitBranch}
                      label="所属分支"
                      value={branchName ?? '未知分支'}
                    />
                  </div>
                </section>

                <section className="drawer-section">
                  <div className="flex items-center justify-between">
                    <span className="drawer-label">提交记录</span>
                    <span className="font-mono text-[11px] text-ink-subtle">
                      {commits.length}
                    </span>
                  </div>
                  {commits.length === 0 ? (
                    <p className="drawer-value text-ink-subtle">暂无提交记录</p>
                  ) : (
                    <ul className="drawer-list">
                      {commits.map((c) => (
                        <li key={c.id} className="drawer-list-item">
                          <GitCommit className="h-3.5 w-3.5 text-ink-subtle" aria-hidden />
                          <span className="flex flex-col">
                            <span className="text-ink">{c.message}</span>
                            <span className="font-mono text-[11px] text-ink-subtle">
                              {CommitType.label(c.type)} ·{' '}
                              {formatRelativeTime(c.createdAt)}
                            </span>
                          </span>
                          <span className="font-mono text-[11px] text-ink-subtle">
                            #{c.id.slice(0, 7)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="drawer-section">
                  <span className="drawer-label">活动</span>
                  <p className="drawer-list-meta">
                    创建于 {formatRelativeTime(task.createdAt)} · 最近更新{' '}
                    {formatRelativeTime(task.updatedAt)}
                  </p>
                </section>

                <div className="mt-auto flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      navigate('settings');
                    }}
                    className="text-xs text-ink-subtle underline-offset-4 hover:underline"
                  >
                    管理数据
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

interface DrawerIconButtonProps {
  icon: typeof CheckCircle2;
  label: string;
  tone?: 'default' | 'danger';
  onClick?: () => void;
  disabled?: boolean;
}

function DrawerIconButton({
  icon: Icon,
  label,
  tone = 'default',
  onClick,
  disabled,
}: DrawerIconButtonProps): JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`topbar-icon-btn border ${
        tone === 'danger'
          ? 'border-error text-error hover:bg-error-soft'
          : 'border-border hover:bg-surface hover:text-ink'
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}

interface DrawerListItemProps {
  icon: typeof CheckCircle2;
  label: string;
  value: string;
}

function DrawerListItem({ icon: Icon, label, value }: DrawerListItemProps): JSX.Element {
  return (
    <div className="drawer-list-item">
      <Icon className="h-3.5 w-3.5 text-ink-subtle" aria-hidden />
      <span className="text-ink-muted">{label}</span>
      <span className="text-right text-ink">{value}</span>
    </div>
  );
}

interface StatusPillProps {
  status: TaskStatus;
}
function StatusPill({ status }: StatusPillProps): JSX.Element {
  const tone =
    status === TaskStatus.done
      ? 'done'
      : status === TaskStatus.inProgress
        ? 'inProgress'
        : status === TaskStatus.cancelled
          ? 'archived'
          : 'todo';
  const label = TaskStatus.label(status);
  return (
    <span className="status-pill" data-tone={tone}>
      {label}
    </span>
  );
}

interface PriorityPillProps {
  priority: Priority;
}
function PriorityPill({ priority }: PriorityPillProps): JSX.Element {
  const tone =
    priority === Priority.high
      ? 'blocked'
      : priority === Priority.low
        ? 'done'
        : 'inProgress';
  return (
    <span className="status-pill" data-tone={tone}>
      优先级 · {Priority.label(priority)}
    </span>
  );
}
