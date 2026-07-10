import * as React from 'react';

import { cn } from '@/core/utils/formatters';
import { Branch } from '@/domain/entities/branch';
import { Commit } from '@/domain/entities/commit';
import { CommitType } from '@/domain/entities/enums';
import { Repository } from '@/domain/entities/repository';

export interface ActivityTabProps {
  commits: Commit[];
  branches: Branch[];
  repositories: Repository[];
  selectedCommit: Commit | null;
  onSelectCommit: (commit: Commit) => void;
}

export function ActivityTab({
  commits,
  branches,
  repositories,
  selectedCommit,
  onSelectCommit,
}: ActivityTabProps): JSX.Element {
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

  const grouped = React.useMemo(() => {
    const map = new Map<string, Commit[]>();
    const sorted = [...commits].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
    for (const commit of sorted) {
      const day = formatDayLabel(commit.createdAt);
      const list = map.get(day) ?? [];
      list.push(commit);
      map.set(day, list);
    }
    return Array.from(map.entries());
  }, [commits]);

  if (commits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--v3-radius-lg)] border border-[var(--v3-border)] bg-[var(--v3-panel)] px-6 py-16 text-center">
        <span className="text-[16px] font-medium text-[var(--v3-text-strong)]">
          这个范围还没有活动
        </span>
        <span className="max-w-[280px] text-[13px] text-[var(--v3-text-secondary)]">
          换一个仓库、分支或时间范围试试。
        </span>
      </div>
    );
  }

  return (
    <div
      className="rounded-[var(--v3-radius-lg)] border border-[var(--v3-border)] bg-[var(--v3-panel)]"
      aria-label="提交活动时间线"
    >
      {grouped.map(([day, list]) => (
        <div key={day} className="border-b border-[var(--v3-divider)] last:border-b-0">
          <header className="bg-[var(--v3-bg-near)] px-4 py-2 text-[12px] font-medium tracking-[0.04em] text-[var(--v3-text-muted)]">
            {day}
          </header>
          <div className="relative">
            {list.map((commit) => {
              const branch = branchMap.get(commit.branchId);
              const repo = branch?.repositoryId
                ? repoMap.get(branch.repositoryId)
                : undefined;
              const isSelected = selectedCommit?.id === commit.id;
              return (
                <button
                  key={commit.id}
                  type="button"
                  onClick={() => onSelectCommit(commit)}
                  className={cn(
                    'group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                    isSelected
                      ? 'bg-[var(--v3-selected)]'
                      : 'hover:bg-[var(--v3-control)]'
                  )}
                  aria-current={isSelected ? 'true' : undefined}
                >
                  <div className="flex w-[52px] shrink-0 flex-col items-end pt-0.5">
                    <span className="font-mono text-[12px] text-[var(--v3-text-muted)]">
                      {formatTime(commit.createdAt)}
                    </span>
                    <CommitMarker type={commit.type} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] text-[var(--v3-text-strong)]">
                      {commit.message}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-[var(--v3-text-muted)]"
                      aria-label={`${CommitType.label(commit.type)} · ${commit.id.slice(0, 7)}`}
                    >
                      <span>{CommitType.label(commit.type)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">#{commit.id.slice(0, 7)}</span>
                      {repo ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{repo.name}</span>
                        </>
                      ) : null}
                      {branch ? (
                        <>
                          <span aria-hidden="true">/</span>
                          <span
                            className="truncate"
                            style={{ color: branch.color }}
                          >
                            {branch.name}
                          </span>
                        </>
                      ) : null}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function CommitMarker({ type }: { type: CommitType }): JSX.Element {
  const color =
    type === CommitType.merge
      ? 'var(--v3-design)'
      : type === CommitType.complete
        ? 'var(--v3-primary)'
        : 'var(--v3-text-muted)';

  return (
    <span
      className="mt-1.5 h-2 w-2 rounded-full"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
}

function formatDayLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  yesterday.setHours(0, 0, 0, 0);

  if (d.getTime() === today.getTime()) return '今天';
  if (d.getTime() === yesterday.getTime()) return '昨天';

  return date.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
