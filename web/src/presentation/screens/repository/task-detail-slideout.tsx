import { CheckCircle2, Trash2, X } from 'lucide-react';

import { Branch } from '@/domain/entities/branch';
import { Priority, TaskStatus } from '@/domain/entities/enums';
import { Repository } from '@/domain/entities/repository';
import { Task } from '@/domain/entities/task';
import { formatDate, formatDateTime } from '@/core/utils/formatters';
import { V3Button, V3IconButton } from '@/presentation/components/v3';

export interface TaskDetailSlideoutProps {
  task: Task | null;
  branch: Branch | null;
  repository: Repository | null;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onDelete: () => void;
}

export function TaskDetailSlideout({
  task,
  branch,
  repository,
  isOpen,
  onClose,
  onComplete,
  onDelete,
}: TaskDetailSlideoutProps): JSX.Element | null {
  if (!isOpen || !task) return null;

  const isCompleted = task.status === TaskStatus.done;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col border-l border-[var(--v3-border)] bg-[var(--v3-panel)] shadow-[var(--v3-shadow-panel)]">
      <header className="flex items-center justify-between border-b border-[var(--v3-border)] px-5 py-4">
        <span className="text-[12px] text-[var(--v3-text-muted)]">任务详情</span>
        <V3IconButton onClick={onClose} aria-label="关闭">
          <X size={16} strokeWidth={1.5} aria-hidden="true" />
        </V3IconButton>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <h2
          className="text-[22px] font-semibold leading-tight"
          style={
            isCompleted
              ? {
                  textDecoration: 'line-through',
                  color: 'var(--v3-text-muted)',
                }
              : { color: 'var(--v3-text-strong)' }
          }
        >
          {task.title}
        </h2>

        <p className="text-[14px] text-[var(--v3-text-secondary)]">
          {task.description || '暂无描述'}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Info label="状态" value={TaskStatus.label(task.status)} />
          <Info label="优先级" value={`${Priority.label(task.priority)}优先级`} />
          <Info
            label="所属仓库"
            value={repository?.name ?? '—'}
            className="col-span-2"
          />
          <Info label="所属分支" value={branch?.name ?? '—'} />
          <Info
            label="截止日期"
            value={task.dueDate ? formatDate(task.dueDate) : '—'}
          />
          <Info
            label="创建时间"
            value={formatDateTime(task.createdAt)}
            className="col-span-2"
          />
          {task.completedAt ? (
            <Info
              label="完成时间"
              value={formatDateTime(task.completedAt)}
              className="col-span-2"
            />
          ) : null}
        </div>
      </div>

      <footer className="flex justify-end gap-2 border-t border-[var(--v3-border)] px-5 py-4">
        <V3Button
          type="button"
          variant="secondary"
          onClick={onDelete}
          className="gap-1.5"
        >
          <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
          删除
        </V3Button>
        <V3Button type="button" onClick={onComplete} className="gap-1.5">
          <CheckCircle2 size={16} strokeWidth={1.5} aria-hidden="true" />
          {isCompleted ? '标记为待办' : '完成并提交'}
        </V3Button>
      </footer>
    </div>
  );
}

interface InfoProps {
  label: string;
  value: string;
  className?: string;
}

function Info({ label, value, className }: InfoProps): JSX.Element {
  return (
    <div className={className}>
      <span className="block text-[12px] text-[var(--v3-text-muted)]">{label}</span>
      <span className="mt-0.5 block text-[14px] text-[var(--v3-text-strong)]">{value}</span>
    </div>
  );
}
