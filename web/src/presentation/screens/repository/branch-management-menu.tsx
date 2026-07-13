import * as React from 'react';
import { GitBranch, Merge, Plus, Trash2, Type, Archive } from 'lucide-react';
import * as PopoverPrimitive from '@radix-ui/react-popover';

import { cn } from '@/core/utils/formatters';
import { Branch } from '@/domain/entities/branch';
import { V3Button, V3Card } from '@/presentation/components/v3';
import { ConfirmDialog } from './confirm-dialog';

export interface BranchManagementMenuProps {
  branches: Branch[];
  activeBranchId: string | null;
  onCreateBranch: (name: string) => void;
  onRenameBranch: (branchId: string, name: string) => void;
  onMergeBranch: (sourceId: string, targetId: string) => void;
  onArchiveBranch?: (branchId: string) => void;
  onDeleteBranch: (branchId: string) => void;
}

export function BranchManagementMenu({
  branches,
  activeBranchId,
  onCreateBranch,
  onRenameBranch,
  onMergeBranch,
  onArchiveBranch,
  onDeleteBranch,
}: BranchManagementMenuProps): JSX.Element {
  const [open, setOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createName, setCreateName] = React.useState('');
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [renameName, setRenameName] = React.useState('');
  const [mergeOpen, setMergeOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const activeBranch = branches.find((b) => b.id === activeBranchId) ?? null;
  const mainBranch = branches.find((b) => b.isMain) ?? null;

  const handleCreate = (): void => {
    if (!createName.trim()) return;
    onCreateBranch(createName.trim());
    setCreateName('');
    setCreateOpen(false);
    setOpen(false);
  };

  const handleRename = (): void => {
    if (!activeBranch || !renameName.trim()) return;
    onRenameBranch(activeBranch.id, renameName.trim());
    setRenameName('');
    setRenameOpen(false);
    setOpen(false);
  };

  const handleMerge = (): void => {
    if (!activeBranch || !mainBranch || activeBranch.id === mainBranch.id) return;
    onMergeBranch(activeBranch.id, mainBranch.id);
    setMergeOpen(false);
    setOpen(false);
  };

  const handleDelete = (): void => {
    if (!activeBranch) return;
    onDeleteBranch(activeBranch.id);
    setDeleteOpen(false);
    setOpen(false);
  };

  return (
    <>
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <V3Button type="button" variant="ghost" size="sm" className="gap-2">
            <GitBranch size={16} strokeWidth={1.5} aria-hidden="true" />
            管理分支
          </V3Button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="end"
            sideOffset={6}
            className="z-50 w-[220px] rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-card)] p-1.5 shadow-[var(--v3-shadow-panel)]"
          >
            <MenuItem icon={Plus} label="新建分支" onClick={() => setCreateOpen(true)} />
            <MenuItem icon={Type} label="重命名当前分支" onClick={() => {
              setRenameName(activeBranch?.name ?? '');
              setRenameOpen(true);
            }} />
            <MenuItem
              icon={Merge}
              label="合并到 main"
              onClick={() => setMergeOpen(true)}
              disabled={!activeBranch || activeBranch.isMain || !mainBranch}
            />
            <MenuItem
              icon={Archive}
              label="归档分支"
              onClick={() => activeBranchId && onArchiveBranch?.(activeBranchId)}
              disabled={!activeBranch || !onArchiveBranch}
            />
            <MenuItem
              icon={Trash2}
              label="删除分支"
              onClick={() => setDeleteOpen(true)}
              disabled={!activeBranch || activeBranch?.isMain}
              danger
            />
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>

      <PromptDialog
        open={createOpen}
        title="新建分支"
        placeholder="分支名称"
        value={createName}
        onChange={setCreateName}
        onConfirm={handleCreate}
        onCancel={() => { setCreateOpen(false); setCreateName(''); }}
      />

      <PromptDialog
        open={renameOpen}
        title="重命名分支"
        placeholder="新分支名称"
        value={renameName}
        onChange={setRenameName}
        onConfirm={handleRename}
        onCancel={() => { setRenameOpen(false); setRenameName(''); }}
      />

      <ConfirmDialog
        open={mergeOpen}
        title="合并分支"
        description={`将 ${activeBranch?.name ?? '当前分支'} 合并到 ${mainBranch?.name ?? 'main'}。未完成任务将迁移到 main。`}
        confirmLabel="合并"
        onConfirm={handleMerge}
        onCancel={() => setMergeOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="删除分支"
        description={`确定要删除 ${activeBranch?.name ?? '当前分支'} 吗？该分支上的任务不会被删除。`}
        confirmLabel="删除"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  danger = false,
}: {
  icon: typeof Plus;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}): JSX.Element {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-[var(--v3-radius-sm)] px-2.5 py-2 text-left text-[13px] transition-colors duration-(--v3-fast)',
        disabled
          ? 'cursor-not-allowed text-[var(--v3-text-disabled)]'
          : danger
            ? 'text-[var(--v3-danger)] hover:bg-[var(--v3-danger)]/10'
            : 'text-[var(--v3-text)] hover:bg-[var(--v3-control)]'
      )}
    >
      <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
      {label}
    </button>
  );
}

interface PromptDialogProps {
  open: boolean;
  title: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function PromptDialog({
  open,
  title,
  placeholder,
  value,
  onChange,
  onConfirm,
  onCancel,
}: PromptDialogProps): JSX.Element | null {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <V3Card className="w-full max-w-[380px] p-5">
        <h3 className="text-[16px] font-semibold text-[var(--v3-text-strong)]">{title}</h3>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus
          className="mt-4 h-10 w-full rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-3 text-[14px] text-[var(--v3-text)] outline-none placeholder:text-[var(--v3-text-muted)] focus-visible:[box-shadow:var(--v3-focus-ring)]"
        />
        <div className="mt-5 flex justify-end gap-2">
          <V3Button variant="secondary" onClick={onCancel}>取消</V3Button>
          <V3Button onClick={onConfirm} disabled={!value.trim()}>确认</V3Button>
        </div>
      </V3Card>
    </div>
  );
}
