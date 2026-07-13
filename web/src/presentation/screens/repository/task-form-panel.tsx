import * as React from 'react';
import { X } from 'lucide-react';

import { cn } from '@/core/utils/formatters';
import { Priority, TaskStatus } from '@/domain/entities/enums';
import { Task } from '@/domain/entities/task';
import { Branch } from '@/domain/entities/branch';
import { V3Button, V3Card, V3IconButton } from '@/presentation/components/v3';

export interface TaskFormData {
  title: string;
  description: string;
  branchId: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
}

export interface TaskFormPanelProps {
  mode: 'new' | 'edit';
  task: Task | null;
  branches: Branch[];
  activeBranchId: string | null;
  onSubmit: (data: TaskFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const statusOptions = [
  { value: TaskStatus.todo, label: '待办' },
  { value: TaskStatus.inProgress, label: '进行中' },
  { value: TaskStatus.done, label: '已完成' },
  { value: TaskStatus.cancelled, label: '已取消' },
];

const priorityOptions = [
  { value: Priority.low, label: '低' },
  { value: Priority.medium, label: '中' },
  { value: Priority.high, label: '高' },
];

export function TaskFormPanel({
  mode,
  task,
  branches,
  activeBranchId,
  onSubmit,
  onCancel,
  isLoading = false,
}: TaskFormPanelProps): JSX.Element {
  const [title, setTitle] = React.useState(task?.title ?? '');
  const [description, setDescription] = React.useState(task?.description ?? '');
  const [branchId, setBranchId] = React.useState(task?.branchId ?? activeBranchId ?? branches[0]?.id ?? '');
  const [status, setStatus] = React.useState<TaskStatus>(task?.status ?? TaskStatus.todo);
  const [priority, setPriority] = React.useState<Priority>(task?.priority ?? Priority.medium);
  const [dueDate, setDueDate] = React.useState<string>(
    task?.dueDate ? task.dueDate.toISOString().split('T')[0] : ''
  );

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      branchId,
      status,
      priority,
      dueDate,
    });
  };

  return (
    <V3Card className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--v3-divider)] p-4">
        <span className="text-[16px] font-semibold text-[var(--v3-text-strong)]">
          {mode === 'new' ? '新建任务' : '编辑任务'}
        </span>
        <V3IconButton aria-label="关闭表单" onClick={onCancel}>
          <X size={16} strokeWidth={1.5} aria-hidden="true" />
        </V3IconButton>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 overflow-auto p-4">
        <Field label="标题">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="任务标题"
            maxLength={100}
            className="h-10 w-full rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-3 text-[14px] text-[var(--v3-text)] outline-none placeholder:text-[var(--v3-text-muted)] focus-visible:[box-shadow:var(--v3-focus-ring)]"
          />
        </Field>

        <Field label="描述">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="描述（可选）"
            rows={4}
            className="w-full resize-none rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-3 py-2 text-[14px] text-[var(--v3-text)] outline-none placeholder:text-[var(--v3-text-muted)] focus-visible:[box-shadow:var(--v3-focus-ring)]"
          />
        </Field>

        <Field label="所属分支">
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            disabled={mode === 'edit'}
            className={cn(
              'h-10 w-full rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-3 text-[14px] text-[var(--v3-text)] outline-none',
              mode === 'edit' && 'cursor-not-allowed opacity-60'
            )}
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="状态">
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatus(option.value)}
                className={cn(
                  'h-8 rounded-[var(--v3-radius-sm)] px-3 text-[13px] transition-colors duration-(--v3-fast)',
                  status === option.value
                    ? 'bg-[var(--v3-primary-soft)] text-[var(--v3-primary)]'
                    : 'bg-[var(--v3-control)] text-[var(--v3-text-secondary)] hover:text-[var(--v3-text)]'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="优先级">
          <div className="flex flex-wrap gap-2">
            {priorityOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPriority(option.value)}
                className={cn(
                  'h-8 rounded-[var(--v3-radius-sm)] px-3 text-[13px] transition-colors duration-(--v3-fast)',
                  priority === option.value
                    ? 'bg-[var(--v3-primary-soft)] text-[var(--v3-primary)]'
                    : 'bg-[var(--v3-control)] text-[var(--v3-text-secondary)] hover:text-[var(--v3-text)]'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="截止日期">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="h-10 w-full rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-3 text-[14px] text-[var(--v3-text)] outline-none"
          />
        </Field>

        <div className="mt-auto flex justify-end gap-2 pt-2">
          <V3Button type="button" variant="secondary" onClick={onCancel}>
            取消
          </V3Button>
          <V3Button type="submit" disabled={!title.trim() || isLoading}>
            {mode === 'new' ? '创建任务' : '保存更改'}
          </V3Button>
        </div>
      </form>
    </V3Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--v3-text-muted)]">
        {label}
      </label>
      {children}
    </div>
  );
}
