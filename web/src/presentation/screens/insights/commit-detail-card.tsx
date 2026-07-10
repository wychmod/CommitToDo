import * as React from 'react';
import { ArrowRight, Check, Copy } from 'lucide-react';

import { V3Button, V3Card } from '@/presentation/components/v3';
import { cn, formatDateTime } from '@/core/utils/formatters';
import { Branch } from '@/domain/entities/branch';
import { Commit } from '@/domain/entities/commit';
import { CommitType } from '@/domain/entities/enums';
import { Repository } from '@/domain/entities/repository';
import { Task } from '@/domain/entities/task';

export interface CommitDetailCardProps {
  commit: Commit | null;
  tasks: Task[];
  branches: Branch[];
  repositories: Repository[];
  onViewTasks: (commit: Commit) => void;
  onCopyHash: (hash: string) => void;
}

export function CommitDetailCard({
  commit,
  tasks,
  branches,
  repositories,
  onViewTasks,
  onCopyHash,
}: CommitDetailCardProps): JSX.Element {
  const [copied, setCopied] = React.useState(false);

  const branchMap = React.useMemo(() => {
    const map = new Map<string, Branch>();
    for (const branch of branches) map.set(branch.id, branch);
    return map;
  }, [branches]);

  const repoMap = React.useMemo(() => {
    const map = new Map<string, Repository>();
    for (const repo of repositories) map.set(repo.id, repo);
    return map;
  }, [repositories]);

  const relatedTasks = React.useMemo(() => {
    if (!commit) return [];
    const primary = tasks.find((t) => t.id === commit.taskId);
    const sameBranch = tasks
      .filter((t) => t.branchId === commit.branchId && t.id !== commit.taskId)
      .sort((a, b) =>
        (b.completedAt?.getTime() ?? b.createdAt.getTime()) -
        (a.completedAt?.getTime() ?? a.createdAt.getTime())
      );
    return primary ? [primary, ...sameBranch.slice(0, 3)] : sameBranch.slice(0, 4);
  }, [commit, tasks]);

  const handleCopy = React.useCallback(() => {
    if (!commit) return;
    void navigator.clipboard.writeText(commit.id).then(() => {
      onCopyHash(commit.id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }, [commit, onCopyHash]);

  if (!commit) {
    return (
      <V3Card className="flex h-[300px] flex-col items-center justify-center gap-2 p-6 text-center">
        <span className="text-[15px] font-medium text-[var(--v3-text-strong)]">
          选择一个提交
        </span>
        <span className="max-w-[220px] text-[13px] text-[var(--v3-text-muted)]">
          点击活动列表或图谱节点查看详情。
        </span>
      </V3Card>
    );
  }

  const branch = branchMap.get(commit.branchId);
  const repository = branch?.repositoryId
    ? repoMap.get(branch.repositoryId)
    : undefined;
  const isMerge = commit.type === CommitType.merge;

  return (
    <V3Card className="flex flex-col gap-4 p-5">
      <div>
        <span className="text-[12px] text-[var(--v3-text-muted)]">提交详情</span>
        <div className="mt-1 flex items-start gap-2">
          {isMerge ? (
            <span
              className="mt-2 h-2 w-2 rounded-full"
              style={{ backgroundColor: 'var(--v3-primary)' }}
              aria-hidden="true"
            />
          ) : null}
          <h3 className="text-[18px] font-semibold leading-tight text-[var(--v3-text-strong)]">
            {commit.message}
          </h3>
        </div>
        <p className="mt-1 font-mono text-[12px] text-[var(--v3-text-muted)]">
          {commit.id.slice(0, 7)} · {formatDateTime(commit.createdAt)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-[12px]">
        <InfoRow label="仓库" value={repository?.name ?? '—'} />
        <InfoRow label="类型" value={CommitType.label(commit.type)} />
        <InfoRow
          label="分支"
          value={
            branch ? (
              <span className="inline-flex items-center gap-1">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: branch.color }}
                  aria-hidden="true"
                />
                {branch.name}
              </span>
            ) : (
              '—'
            )
          }
        />
        <InfoRow label="关联任务" value={`${relatedTasks.length}`} />
      </div>

      {relatedTasks.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-[12px] text-[var(--v3-text-muted)]">变更任务 · {relatedTasks.length} 项</span>
          <ul className="flex flex-col gap-1">
            {relatedTasks.map((task) => (
              <li
                key={task.id}
                className="flex h-[28px] items-center gap-2 text-[13px] text-[var(--v3-text)]"
              >
                <Check
                  size={14}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className="text-[var(--v3-primary)]"
                />
                <span className="flex-1 truncate">{task.title}</span>
                <span className="font-mono text-[11px] text-[var(--v3-text-muted)]"
                >
                  #{task.id.slice(0, 4)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-1 flex flex-col gap-2">
        <V3Button
          asChild
          onClick={() => onViewTasks(commit)}
          className="w-full"
        >
          <button type="button" className="w-full">
            <span>查看相关任务</span>
            <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </V3Button>

        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            'flex h-[36px] w-full items-center justify-center gap-2 rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-transparent text-[13px] font-medium text-[var(--v3-text-secondary)] transition-colors hover:border-[var(--v3-primary)] hover:text-[var(--v3-text-strong)] focus-visible:outline-none focus-visible:[box-shadow:var(--v3-focus-ring)]',
            copied && 'border-[var(--v3-primary)] text-[var(--v3-primary)]'
          )}
        >
          {copied ? (
            <>
              <Check size={16} strokeWidth={1.5} aria-hidden="true" />
              <span>已复制</span>
            </>
          ) : (
            <>
              <Copy size={16} strokeWidth={1.5} aria-hidden="true" />
              <span>复制哈希</span>
            </>
          )}
        </button>
      </div>
    </V3Card>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[var(--v3-text-muted)]">{label}</span>
      <span className="font-medium text-[var(--v3-text)]">{value}</span>
    </div>
  );
}
