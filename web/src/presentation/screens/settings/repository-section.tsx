import * as React from 'react';
import { useState } from 'react';
import { Archive, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { V3Button } from '@/presentation/components/v3';
import { Repository } from '@/domain/entities/repository';
import { Branch } from '@/domain/entities/branch';
import { SettingsSelect } from './settings-select';
import { SettingsDialog } from './settings-dialog';

export interface RepositorySectionProps {
  repository: Repository | null;
  branches: Branch[];
  onUpdate: (updates: {
    name?: string;
    description?: string | null;
    defaultBranchId?: string | null;
  }) => Promise<Repository | null>;
  onArchive: () => Promise<Repository | null>;
  onDelete: () => Promise<void>;
  onSaved?: () => void;
}

export function RepositorySection({
  repository,
  branches,
  onUpdate,
  onArchive,
  onDelete,
  onSaved,
}: RepositorySectionProps): JSX.Element {
  const navigate = useNavigate();
  const [name, setName] = useState(repository?.name ?? '');
  const [description, setDescription] = useState(repository?.description ?? '');
  const [defaultBranchId, setDefaultBranchId] = useState(
    repository &&
      repository.defaultBranchId &&
      branches.some((b) => b.id === repository.defaultBranchId)
      ? repository.defaultBranchId
      : branches.find((b) => b.isMain)?.id ?? branches[0]?.id ?? ''
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (repository) {
      setName(repository.name);
      setDescription(repository.description ?? '');
      setDefaultBranchId(
        repository.defaultBranchId &&
          branches.some((b) => b.id === repository.defaultBranchId)
          ? repository.defaultBranchId
          : branches.find((b) => b.isMain)?.id ?? branches[0]?.id ?? ''
      );
    }
  }, [repository, branches]);

  if (!repository) {
    return (
      <section
        id="repository"
        className="scroll-mt-[92px]"
        aria-labelledby="repository-heading"
      >
        <h2
          id="repository-heading"
          className="text-[20px] font-semibold text-[var(--v3-text-strong)]"
        >
          当前仓库
        </h2>
        <div className="mt-6 rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] p-6 text-center">
          <p className="text-[16px] font-medium text-[var(--v3-text-strong)]">
            尚未选择仓库
          </p>
          <p className="mt-1 text-[14px] text-[var(--v3-text-secondary)]">
            选择一个仓库后可以管理名称、默认分支和危险操作。
          </p>
          <V3Button
            className="mt-4"
            onClick={() => navigate('/workspace')}
          >
            选择仓库
          </V3Button>
        </div>
      </section>
    );
  }

  const handleNameBlur = async (): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('仓库名称不能为空');
      return;
    }
    setNameError(null);
    if (trimmed === repository.name) return;
    setIsSaving(true);
    try {
      await onUpdate({ name: trimmed });
      onSaved?.();
    } catch {
      setNameError('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDescriptionBlur = async (): Promise<void> => {
    const trimmed = description.trim();
    if (trimmed === (repository.description ?? '')) return;
    setIsSaving(true);
    try {
      await onUpdate({ description: trimmed || null });
      onSaved?.();
    } catch {
      // Keep user input; error shown by parent.
    } finally {
      setIsSaving(false);
    }
  };

  const handleDefaultBranchChange = async (value: string): Promise<void> => {
    setDefaultBranchId(value);
    setIsSaving(true);
    try {
      await onUpdate({ defaultBranchId: value || null });
      onSaved?.();
    } catch {
      // Revert on error.
      setDefaultBranchId(
        repository.defaultBranchId ??
          branches.find((b) => b.isMain)?.id ??
          branches[0]?.id ??
          ''
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async (): Promise<void> => {
    await onArchive();
    setArchiveOpen(false);
  };

  const handleDelete = async (): Promise<void> => {
    await onDelete();
    setDeleteOpen(false);
    setDeleteConfirm('');
    navigate('/workspace');
  };

  const unarchivedBranches = branches.filter((b) => !b.isDeleted);
  const canDelete = deleteConfirm.trim() === repository.name;

  return (
    <section
      id="repository"
      className="scroll-mt-[92px]"
      aria-labelledby="repository-heading"
    >
      <h2
        id="repository-heading"
        className="text-[20px] font-semibold text-[var(--v3-text-strong)]"
      >
        当前仓库
      </h2>

      <div className="mt-6 flex flex-col gap-5">
        <SettingsRow label="仓库名称">
          <div className="flex flex-col gap-1">
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(null);
              }}
              onBlur={() => void handleNameBlur()}
              disabled={isSaving}
              className="h-[36px] w-full max-w-[694px] rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-3 text-[14px] text-[var(--v3-text)] transition-[border-color,background-color] duration-[var(--v3-fast)] focus-visible:outline-none focus-visible:[box-shadow:var(--v3-focus-ring)] disabled:opacity-50"
            />
            {nameError ? (
              <span className="text-[13px] text-[var(--v3-danger)]">{nameError}</span>
            ) : null}
          </div>
        </SettingsRow>

        <SettingsRow label="仓库描述">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => void handleDescriptionBlur()}
            disabled={isSaving}
            placeholder="可选，描述这个仓库的用途"
            className="h-[36px] w-full max-w-[694px] rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-3 text-[14px] text-[var(--v3-text)] transition-[border-color,background-color] duration-[var(--v3-fast)] focus-visible:outline-none focus-visible:[box-shadow:var(--v3-focus-ring)] disabled:opacity-50 placeholder:text-[var(--v3-text-muted)]"
          />
        </SettingsRow>

        <SettingsRow label="默认分支">
          <SettingsSelect
            ariaLabel="默认分支"
            value={defaultBranchId}
            options={unarchivedBranches.map((b) => ({
              value: b.id,
              label: b.name,
            }))}
            onChange={(value) => void handleDefaultBranchChange(value)}
            disabled={isSaving || unarchivedBranches.length === 0}
            className="w-full max-w-[694px]"
          />
        </SettingsRow>

        <div className="mt-4 flex items-center justify-between border-t border-[var(--v3-divider)] pt-5">
          <V3Button
            variant="secondary"
            size="sm"
            onClick={() => setArchiveOpen(true)}
          >
            <Archive size={16} strokeWidth={1.5} aria-hidden="true" />
            归档仓库
          </V3Button>

          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="inline-flex h-[32px] items-center gap-2 rounded-[var(--v3-radius-md)] px-3 text-[14px] font-semibold text-[var(--v3-danger)] transition-colors hover:bg-[var(--v3-danger)]/10 focus-visible:outline-none focus-visible:[box-shadow:var(--v3-focus-ring)]"
          >
            <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
            删除仓库
          </button>
        </div>
      </div>

      <SettingsDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="归档仓库"
        description="归档后默认列表将隐藏此仓库，可在设置中恢复。"
        footer={
          <>
            <V3Button variant="ghost" onClick={() => setArchiveOpen(false)}>
              取消
            </V3Button>
            <V3Button onClick={() => void handleArchive()}>归档</V3Button>
          </>
        }
      >
        <p className="text-[14px] text-[var(--v3-text-secondary)]">
          仓库「{repository.name}」将被归档。
        </p>
      </SettingsDialog>

      <SettingsDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeleteConfirm('');
        }}
        title="删除仓库"
        description="此操作不可撤销，将删除仓库、分支、任务和提交。"
        footer={
          <>
            <V3Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              取消
            </V3Button>
            <V3Button
              disabled={!canDelete}
              onClick={() => void handleDelete()}
              className="bg-[var(--v3-danger)] text-[var(--v3-text-strong)] hover:bg-[var(--v3-danger)]"
            >
              删除
            </V3Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-[14px] text-[var(--v3-text-secondary)]">
            请输入仓库名「{repository.name}」以确认删除：
          </p>
          <input
            type="text"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            className="h-[36px] w-full rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-3 text-[14px] text-[var(--v3-text)] focus-visible:outline-none focus-visible:[box-shadow:var(--v3-focus-ring)]"
          />
        </div>
      </SettingsDialog>
    </section>
  );
}

interface SettingsRowProps {
  label: string;
  children: React.ReactNode;
}

function SettingsRow({ label, children }: SettingsRowProps): JSX.Element {
  return (
    <div className="flex flex-col gap-3 tablet:flex-row tablet:items-start">
      <span className="w-[118px] shrink-0 pt-1.5 text-[14px] text-[var(--v3-text)]">
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}
