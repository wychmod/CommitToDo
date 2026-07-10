import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as React from 'react';
import { X } from 'lucide-react';

import { Priority, TaskStatus } from '@/domain/entities/enums';
import { Repository } from '@/domain/entities/repository';
import { Branch } from '@/domain/entities/branch';
import { V3Button } from '@/presentation/components/v3/v3-button';
import { cn } from '@/core/utils/formatters';

export interface WorkspaceTaskFormData {
  branchId: string;
  title: string;
  description: string;
  priority: Priority;
  dueDate: Date | null;
  status: TaskStatus;
}

export interface WorkspaceTaskFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRepositoryId: string | null;
  defaultBranchId: string | null;
  repositories: Repository[];
  branches: Branch[];
  onSubmit: (data: WorkspaceTaskFormData) => void;
  isLoading?: boolean;
}

const priorityOptions = [
  { value: Priority.high, label: '高' },
  { value: Priority.medium, label: '中' },
  { value: Priority.low, label: '低' },
];

export function WorkspaceTaskFormDrawer({
  open,
  onOpenChange,
  defaultRepositoryId,
  defaultBranchId,
  repositories,
  branches,
  onSubmit,
  isLoading = false,
}: WorkspaceTaskFormDrawerProps): JSX.Element {
  const [repositoryId, setRepositoryId] = React.useState<string | null>(defaultRepositoryId);
  const [branchId, setBranchId] = React.useState<string | null>(defaultBranchId);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [priority, setPriority] = React.useState<Priority>(Priority.medium);
  const [dueDate, setDueDate] = React.useState<string>('');

  React.useEffect(() => {
    if (!open) return;
    const repoId = defaultRepositoryId ?? repositories[0]?.id ?? null;
    setRepositoryId(repoId);
  }, [open, defaultRepositoryId, repositories]);

  React.useEffect(() => {
    if (!open) return;
    const repoBranches = branches.filter((b) => b.repositoryId === repositoryId);
    const nextBranch =
      repoBranches.find((b) => b.id === defaultBranchId) ??
      repoBranches.find((b) => b.isMain) ??
      repoBranches[0];
    setBranchId(nextBranch?.id ?? null);
  }, [open, repositoryId, defaultBranchId, branches]);

  const repositoryBranches = React.useMemo(
    () => branches.filter((b) => b.repositoryId === repositoryId),
    [branches, repositoryId]
  );

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!branchId || !title.trim()) return;
    onSubmit({
      branchId,
      title: title.trim(),
      description: description.trim(),
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: TaskStatus.todo,
    });
  };

  const reset = React.useCallback((): void => {
    setTitle('');
    setDescription('');
    setPriority(Priority.medium);
    setDueDate('');
  }, []);

  React.useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-label="快速添加任务"
          className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[420px] flex-col border-l border-[var(--v3-border)] bg-[var(--v3-card)] p-6 shadow-[var(--v3-shadow-panel)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
        >
          <header className="mb-6 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--v3-primary)]">
                NEW TASK
              </span>
              <DialogPrimitive.Title className="mt-1 text-[20px] font-semibold text-[var(--v3-text-strong)]">
                快速添加任务
              </DialogPrimitive.Title>
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

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[var(--v3-text-muted)]">
                仓库
              </label>
              <select
                value={repositoryId ?? ''}
                onChange={(e) => setRepositoryId(e.target.value)}
                className="h-10 rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-3 text-[14px] text-[var(--v3-text)] outline-none focus-visible:border-[var(--v3-primary)]"
              >
                {repositories.map((repo) => (
                  <option key={repo.id} value={repo.id}>
                    {repo.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[var(--v3-text-muted)]">
                分支
              </label>
              <select
                value={branchId ?? ''}
                onChange={(e) => setBranchId(e.target.value)}
                className="h-10 rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-3 text-[14px] text-[var(--v3-text)] outline-none focus-visible:border-[var(--v3-primary)]"
              >
                {repositoryBranches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[var(--v3-text-muted)]">
                标题
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="任务标题"
                autoFocus
                className="h-10 rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-3 text-[14px] text-[var(--v3-text)] placeholder:text-[var(--v3-text-faint)] outline-none focus-visible:border-[var(--v3-primary)]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[var(--v3-text-muted)]">
                描述
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="描述（可选）"
                rows={4}
                className="resize-none rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-3 py-2 text-[14px] text-[var(--v3-text)] placeholder:text-[var(--v3-text-faint)] outline-none focus-visible:border-[var(--v3-primary)]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[var(--v3-text-muted)]">
                截止日期
              </label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-10 rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-3 text-[14px] text-[var(--v3-text)] outline-none focus-visible:border-[var(--v3-primary)]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[var(--v3-text-muted)]">
                优先级
              </label>
              <div className="grid grid-cols-3 gap-2">
                {priorityOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPriority(option.value)}
                    className={cn(
                      'h-9 rounded-[var(--v3-radius-md)] border text-[14px] font-medium transition-colors',
                      priority === option.value
                        ? 'border-[var(--v3-primary)] bg-[var(--v3-primary-soft)] text-[var(--v3-primary)]'
                        : 'border-[var(--v3-border)] bg-[var(--v3-bg-near)] text-[var(--v3-text-secondary)] hover:border-[var(--v3-text-muted)]'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[var(--v3-text-muted)]">
                状态
              </label>
              <span className="inline-flex h-9 w-fit items-center rounded-[var(--v3-radius-sm)] bg-[var(--v3-control)] px-3 text-[14px] text-[var(--v3-text-secondary)]">
                待办
              </span>
            </div>

            <div className="mt-auto flex justify-end gap-3 pt-4">
              <DialogPrimitive.Close asChild>
                <V3Button type="button" variant="secondary" disabled={isLoading}>
                  取消
                </V3Button>
              </DialogPrimitive.Close>
              <V3Button type="submit" disabled={!title.trim() || !branchId || isLoading}>
                保存任务
              </V3Button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
