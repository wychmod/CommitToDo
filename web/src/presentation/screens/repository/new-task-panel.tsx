import * as React from 'react';
import { X } from 'lucide-react';

import { Branch } from '@/domain/entities/branch';
import { Priority, TaskStatus } from '@/domain/entities/enums';
import { V3Button, V3IconButton } from '@/presentation/components/v3';

export interface NewTaskPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    branchId: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: Priority;
    dueDate: Date | null;
  }) => void;
  branches: Branch[];
  defaultBranchId: string;
  repositoryName: string;
}

const priorityOptions = [
  { value: Priority.low.toString(), label: '低' },
  { value: Priority.medium.toString(), label: '中' },
  { value: Priority.high.toString(), label: '高' },
];

const statusOptions = [
  { value: TaskStatus.todo.toString(), label: '待办' },
  { value: TaskStatus.inProgress.toString(), label: '进行中' },
  { value: TaskStatus.done.toString(), label: '已完成' },
];

export function NewTaskPanel({
  isOpen,
  onClose,
  onSubmit,
  branches,
  defaultBranchId,
  repositoryName,
}: NewTaskPanelProps): JSX.Element | null {
  const [branchId, setBranchId] = React.useState(defaultBranchId);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [status, setStatus] = React.useState(TaskStatus.todo);
  const [priority, setPriority] = React.useState(Priority.medium);
  const [dueDate, setDueDate] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
      setBranchId(defaultBranchId);
      setTitle('');
      setDescription('');
      setStatus(TaskStatus.todo);
      setPriority(Priority.medium);
      setDueDate('');
    }
  }, [isOpen, defaultBranchId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!title.trim() || !branchId) return;
    onSubmit({
      branchId,
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
    });
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[460px] flex-col border-l border-[var(--v3-border)] bg-[var(--v3-panel)] shadow-[var(--v3-shadow-panel)]">
      <header className="flex items-center justify-between border-b border-[var(--v3-border)] px-5 py-4">
        <div className="flex flex-col">
          <span className="text-[12px] text-[var(--v3-text-muted)]">
            {repositoryName}
          </span>
          <h2 className="text-[18px] font-semibold text-[var(--v3-text-strong)]">
            新建任务
          </h2>
        </div>
        <V3IconButton onClick={onClose} aria-label="关闭">
          <X size={16} strokeWidth={1.5} aria-hidden="true" />
        </V3IconButton>
      </header>

      <form
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col gap-4 overflow-y-auto p-5"
      >
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="task-branch"
            className="text-[13px] text-[var(--v3-text-secondary)]"
          >
            分支
          </label>
          <select
            id="task-branch"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="h-10 rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg)] px-3 text-[14px] text-[var(--v3-text-strong)] focus-visible:border-[var(--v3-primary)] focus-visible:outline-none focus-visible:[box-shadow:var(--v3-focus-ring)]"
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="task-title"
            className="text-[13px] text-[var(--v3-text-secondary)]"
          >
            任务标题
          </label>
          <input
            id="task-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="要做什么？"
            className="h-10 rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg)] px-3 text-[14px] text-[var(--v3-text-strong)] placeholder:text-[var(--v3-text-faint)] focus-visible:border-[var(--v3-primary)] focus-visible:outline-none focus-visible:[box-shadow:var(--v3-focus-ring)]"
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="task-description"
            className="text-[13px] text-[var(--v3-text-secondary)]"
          >
            描述（可选）
          </label>
          <textarea
            id="task-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="补充说明…"
            rows={4}
            className="rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg)] px-3 py-2 text-[14px] text-[var(--v3-text-strong)] placeholder:text-[var(--v3-text-faint)] focus-visible:border-[var(--v3-primary)] focus-visible:outline-none focus-visible:[box-shadow:var(--v3-focus-ring)]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] text-[var(--v3-text-secondary)]">状态</span>
          <div className="flex gap-2">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatus(TaskStatus.fromValue(Number(option.value)))}
                className={`h-9 flex-1 rounded-[var(--v3-radius-md)] border text-[13px] transition-colors ${
                  status === TaskStatus.fromValue(Number(option.value))
                    ? 'border-[var(--v3-primary)] bg-[var(--v3-primary-soft)] text-[var(--v3-primary)]'
                    : 'border-[var(--v3-border)] bg-[var(--v3-control)] text-[var(--v3-text-secondary)] hover:bg-[var(--v3-control-hover)]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] text-[var(--v3-text-secondary)]">优先级</span>
          <div className="flex gap-2">
            {priorityOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPriority(Priority.fromValue(Number(option.value)))}
                className={`h-9 flex-1 rounded-[var(--v3-radius-md)] border text-[13px] transition-colors ${
                  priority === Priority.fromValue(Number(option.value))
                    ? 'border-[var(--v3-primary)] bg-[var(--v3-primary-soft)] text-[var(--v3-primary)]'
                    : 'border-[var(--v3-border)] bg-[var(--v3-control)] text-[var(--v3-text-secondary)] hover:bg-[var(--v3-control-hover)]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="task-due"
            className="text-[13px] text-[var(--v3-text-secondary)]"
          >
            截止日期（可选）
          </label>
          <input
            id="task-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="h-10 rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg)] px-3 text-[14px] text-[var(--v3-text-strong)] focus-visible:border-[var(--v3-primary)] focus-visible:outline-none focus-visible:[box-shadow:var(--v3-focus-ring)]"
          />
        </div>
      </form>

      <footer className="flex justify-end gap-2 border-t border-[var(--v3-border)] px-5 py-4">
        <V3Button type="button" variant="secondary" onClick={onClose}>
          取消
        </V3Button>
        <V3Button type="button" onClick={handleSubmit} disabled={!title.trim()}>
          创建
        </V3Button>
      </footer>
    </div>
  );
}
