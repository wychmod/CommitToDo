import * as React from 'react';
import { X } from 'lucide-react';

import { CommitType } from '@/domain/entities/enums';
import { Task } from '@/domain/entities/task';
import { V3Button, V3Card, V3IconButton } from '@/presentation/components/v3';

export interface CompleteCommitPanelProps {
  task: Task;
  onConfirm: (input: { type: CommitType; title: string; description: string }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const commitTypeOptions = [
  { value: CommitType.complete, label: 'feat' },
  { value: CommitType.update, label: 'update' },
  { value: CommitType.create, label: 'chore' },
];

export function CompleteCommitPanel({
  task,
  onConfirm,
  onCancel,
  isLoading = false,
}: CompleteCommitPanelProps): JSX.Element {
  const [type, setType] = React.useState<CommitType>(CommitType.complete);
  const [title, setTitle] = React.useState(task.title);
  const [description, setDescription] = React.useState('');

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    onConfirm({ type, title: title.trim() || task.title, description: description.trim() });
  };

  return (
    <V3Card className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--v3-divider)] p-4">
        <span className="text-[16px] font-semibold text-[var(--v3-text-strong)]">完成并提交</span>
        <V3IconButton aria-label="关闭" onClick={onCancel}>
          <X size={16} strokeWidth={1.5} aria-hidden="true" />
        </V3IconButton>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 overflow-auto p-4">
        <p className="text-[14px] text-[var(--v3-text-secondary)]">
          将任务标记为已完成，并生成一条提交记录。
        </p>

        <Field label="提交类型">
          <select
            value={type}
            onChange={(e) => setType(Number(e.target.value) as CommitType)}
            className="h-10 w-full rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-3 text-[14px] text-[var(--v3-text)] outline-none"
          >
            {commitTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="提交标题">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="提交标题"
            className="h-10 w-full rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-3 text-[14px] text-[var(--v3-text)] outline-none placeholder:text-[var(--v3-text-muted)] focus-visible:[box-shadow:var(--v3-focus-ring)]"
          />
        </Field>

        <Field label="说明">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="可选"
            rows={4}
            className="w-full resize-none rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-3 py-2 text-[14px] text-[var(--v3-text)] outline-none placeholder:text-[var(--v3-text-muted)] focus-visible:[box-shadow:var(--v3-focus-ring)]"
          />
        </Field>

        <div className="mt-auto flex justify-end gap-2 pt-2">
          <V3Button type="button" variant="secondary" onClick={onCancel}>
            取消
          </V3Button>
          <V3Button type="submit" disabled={!title.trim() || isLoading}>
            完成并提交
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
