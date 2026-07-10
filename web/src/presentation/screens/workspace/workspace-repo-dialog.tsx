import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as React from 'react';

import { V3Button } from '@/presentation/components/v3/v3-button';
import { cn } from '@/core/utils/formatters';

export interface WorkspaceRepoFormData {
  name: string;
  description: string;
  defaultBranch: string;
  color: string;
}

export interface WorkspaceRepoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: WorkspaceRepoFormData) => void;
  isLoading?: boolean;
}

const colorOptions = [
  { value: '#80e48c', label: '绿' },
  { value: '#59cbd0', label: '青' },
  { value: '#6e95ff', label: '蓝' },
  { value: '#e3a33c', label: '黄' },
  { value: '#e6635b', label: '红' },
];

export function WorkspaceRepoDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
}: WorkspaceRepoDialogProps): JSX.Element {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [defaultBranch, setDefaultBranch] = React.useState('main');
  const [color, setColor] = React.useState(colorOptions[0].value);

  React.useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setDefaultBranch('main');
      setColor(colorOptions[0].value);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      defaultBranch: defaultBranch.trim() || 'main',
      color,
    });
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-label="新建仓库"
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-[var(--v3-radius-lg)] border border-[var(--v3-border)] bg-[var(--v3-card)] p-6 shadow-[var(--v3-shadow-panel)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <DialogPrimitive.Title className="text-[20px] font-semibold text-[var(--v3-text-strong)]">
            新建仓库
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1 text-[14px] text-[var(--v3-text-muted)]">
            创建一个新仓库来组织目标与任务。
          </DialogPrimitive.Description>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[var(--v3-text-muted)]">
                仓库名称
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：运动计划"
                autoFocus
                className="h-10 rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-3 text-[14px] text-[var(--v3-text)] placeholder:text-[var(--v3-text-faint)] outline-none focus-visible:border-[var(--v3-primary)]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[var(--v3-text-muted)]">
                描述
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简短描述（可选）"
                className="h-10 rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-3 text-[14px] text-[var(--v3-text)] placeholder:text-[var(--v3-text-faint)] outline-none focus-visible:border-[var(--v3-primary)]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[var(--v3-text-muted)]">
                默认分支
              </label>
              <input
                type="text"
                value={defaultBranch}
                onChange={(e) => setDefaultBranch(e.target.value)}
                placeholder="main"
                className="h-10 rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-3 text-[14px] text-[var(--v3-text)] placeholder:text-[var(--v3-text-faint)] outline-none focus-visible:border-[var(--v3-primary)]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[var(--v3-text-muted)]">
                颜色
              </label>
              <div className="flex gap-2">
                {colorOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setColor(option.value)}
                    className={cn(
                      'flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[var(--v3-radius-md)] border text-[13px] font-medium transition-colors',
                      color === option.value
                        ? 'border-[var(--v3-primary)] bg-[var(--v3-primary-soft)] text-[var(--v3-primary)]'
                        : 'border-[var(--v3-border)] bg-[var(--v3-bg-near)] text-[var(--v3-text-secondary)] hover:border-[var(--v3-text-muted)]'
                    )}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full"
                      style={{ backgroundColor: option.value }}
                      aria-hidden="true"
                    />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-2 flex justify-end gap-3">
              <DialogPrimitive.Close asChild>
                <V3Button type="button" variant="secondary" disabled={isLoading}>
                  取消
                </V3Button>
              </DialogPrimitive.Close>
              <V3Button type="submit" disabled={!name.trim() || isLoading}>
                创建仓库
              </V3Button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
