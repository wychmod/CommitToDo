import * as React from 'react';

import { Branch } from '@/domain/entities/branch';
import { V3Button } from '@/presentation/components/v3';

export interface NewBranchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    parentBranchId: string | null;
    color: string;
    description: string;
  }) => void;
  branches: Branch[];
  defaultParentBranchId: string | null;
}

const colorOptions = [
  { value: '#80e48c', label: '绿', token: 'var(--v3-primary)' },
  { value: '#59cbd0', label: '青', token: 'var(--v3-launch)' },
  { value: '#6e95ff', label: '蓝', token: 'var(--v3-design)' },
  { value: '#a78bfa', label: '紫', token: '#a78bfa' },
];

export function NewBranchDialog({
  isOpen,
  onClose,
  onSubmit,
  branches,
  defaultParentBranchId,
}: NewBranchDialogProps): JSX.Element | null {
  const [name, setName] = React.useState('');
  const [parentBranchId, setParentBranchId] = React.useState<string | null>(
    defaultParentBranchId
  );
  const [color, setColor] = React.useState(colorOptions[0].value);
  const [description, setDescription] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
      setName('');
      setParentBranchId(defaultParentBranchId);
      setColor(colorOptions[0].value);
      setDescription('');
    }
  }, [isOpen, defaultParentBranchId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      parentBranchId,
      color,
      description: description.trim(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="新建分支"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[420px] rounded-[var(--v3-radius-lg)] border border-[var(--v3-border)] bg-[var(--v3-panel)] p-6 shadow-[var(--v3-shadow-panel)]">
        <h2 className="text-[18px] font-semibold text-[var(--v3-text-strong)]">
          新建分支
        </h2>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="branch-name"
              className="text-[13px] text-[var(--v3-text-secondary)]"
            >
              分支名称
            </label>
            <input
              id="branch-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如 feature/landing"
              className="h-10 rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg)] px-3 text-[14px] text-[var(--v3-text-strong)] placeholder:text-[var(--v3-text-faint)] focus-visible:border-[var(--v3-primary)] focus-visible:outline-none focus-visible:[box-shadow:var(--v3-focus-ring)]"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="branch-parent"
              className="text-[13px] text-[var(--v3-text-secondary)]"
            >
              基于分支
            </label>
            <select
              id="branch-parent"
              value={parentBranchId ?? ''}
              onChange={(e) =>
                setParentBranchId(e.target.value || null)
              }
              className="h-10 rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg)] px-3 text-[14px] text-[var(--v3-text-strong)] focus-visible:border-[var(--v3-primary)] focus-visible:outline-none focus-visible:[box-shadow:var(--v3-focus-ring)]"
            >
              <option value="">无</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] text-[var(--v3-text-secondary)]">颜色</span>
            <div className="flex gap-2">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setColor(option.value)}
                  className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[var(--v3-radius-md)] border text-[13px] transition-colors ${
                    color === option.value
                      ? 'border-[var(--v3-primary)] bg-[var(--v3-primary-soft)] text-[var(--v3-primary)]'
                      : 'border-[var(--v3-border)] bg-[var(--v3-control)] text-[var(--v3-text-secondary)] hover:bg-[var(--v3-control-hover)]'
                  }`}
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: option.token }}
                    aria-hidden="true"
                  />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="branch-description"
              className="text-[13px] text-[var(--v3-text-secondary)]"
            >
              描述（可选）
            </label>
            <textarea
              id="branch-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="这个分支用来做什么…"
              rows={3}
              className="rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg)] px-3 py-2 text-[14px] text-[var(--v3-text-strong)] placeholder:text-[var(--v3-text-faint)] focus-visible:border-[var(--v3-primary)] focus-visible:outline-none focus-visible:[box-shadow:var(--v3-focus-ring)]"
            />
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <V3Button type="button" variant="secondary" onClick={onClose}>
              取消
            </V3Button>
            <V3Button type="submit" disabled={!name.trim()}>
              保存
            </V3Button>
          </div>
        </form>
      </div>
    </div>
  );
}
