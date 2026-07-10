import * as React from 'react';
import { Link } from 'react-router-dom';

import { Commit } from '@/domain/entities/commit';
import { CommitType } from '@/domain/entities/enums';
import { Branch } from '@/domain/entities/branch';
import { formatRelativeTime } from '@/core/utils/formatters';
import { V3Card } from '@/presentation/components/v3';
import { getBranchColorToken } from './repository-overview-helpers';

export interface CommitTimelineCardProps {
  repositoryId: string;
  commits: Commit[];
  branches: Branch[];
}

export function CommitTimelineCard({
  repositoryId,
  commits,
  branches,
}: CommitTimelineCardProps): JSX.Element {
  const branchMap = React.useMemo(() => {
    const map = new Map<string, Branch>();
    for (const branch of branches) map.set(branch.id, branch);
    return map;
  }, [branches]);

  const recentCommits = commits.slice(0, 4);

  return (
    <V3Card className="flex h-full flex-col p-[18px]">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-[18px] font-semibold text-[var(--v3-text-strong)]">
          最近提交
        </h2>
      </header>

      {recentCommits.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <span className="text-[14px] text-[var(--v3-text-secondary)]">
            还没有提交
          </span>
          <span className="mt-1 text-[12px] text-[var(--v3-text-muted)]">
            完成任务后会在这里留下记录。
          </span>
        </div>
      ) : (
        <div className="relative flex-1">
          <div
            className="absolute left-[6px] top-2 bottom-2 w-[1px] bg-[var(--v3-border)]"
            aria-hidden="true"
          />
          <ul className="flex flex-col gap-4">
            {recentCommits.map((commit) => {
              const branch = branchMap.get(commit.branchId);
              const color = branch
                ? getBranchColorToken(branch)
                : 'var(--v3-text-muted)';
              const typeLabel = CommitType.label(commit.type);
              return (
                <li key={commit.id} className="relative pl-6">
                  <span
                    className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2"
                    style={{ borderColor: color, backgroundColor: 'transparent' }}
                    aria-hidden="true"
                  />
                  <Link
                    to={`/insights?repository=${repositoryId}&tab=activity&commit=${commit.id}`}
                    className="group block rounded-[var(--v3-radius-sm)] p-2 transition-colors hover:bg-[var(--v3-control)]"
                  >
                    <span className="block text-[15px] text-[var(--v3-text-strong)] group-hover:text-[var(--v3-text)]">
                      {typeLabel}: {commit.message}
                    </span>
                    <span className="mt-1 flex items-center gap-2 text-[12px] text-[var(--v3-text-muted)]"
                    >
                      <span className="font-mono">#{commit.id.slice(0, 7)}</span>
                      <span>·</span>
                      <span>{formatRelativeTime(commit.createdAt)}</span>
                      {branch ? (
                        <>
                          <span>·</span>
                          <span style={{ color }}>{branch.name}</span>
                        </>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-4">
        <Link
          to={`/insights?repository=${repositoryId}&tab=activity`}
          className="inline-flex items-center gap-1 text-[13px] text-[var(--v3-text-secondary)] transition-colors hover:text-[var(--v3-primary)]"
        >
          查看全部提交
          <span aria-hidden="true">{'>'}</span>
        </Link>
      </div>
    </V3Card>
  );
}
