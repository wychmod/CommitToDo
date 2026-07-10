import { ChevronRight } from 'lucide-react';

import { Branch } from '@/domain/entities/branch';
import { formatRelativeTime } from '@/core/utils/formatters';
import { V3Card } from '@/presentation/components/v3';
import { getBranchColorToken } from './repository-overview-helpers';

export interface BranchSummaryCardProps {
  branch: Branch;
  totalCount: number;
  inProgressCount: number;
  lastActivity: Date | null;
  isActive: boolean;
  onClick: () => void;
}

export function BranchSummaryCard({
  branch,
  totalCount,
  inProgressCount,
  lastActivity,
  isActive,
  onClick,
}: BranchSummaryCardProps): JSX.Element {
  const color = getBranchColorToken(branch);

  return (
    <V3Card
      asChild
      className="relative w-full cursor-pointer overflow-hidden p-[18px] text-left"
      accent={isActive ? 'primary' : undefined}
    >
      <button
        type="button"
        onClick={onClick}
        aria-pressed={isActive}
        className="block w-full"
      >
        <span
          className="absolute left-0 top-0 h-full w-[2px]"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
            <span
              className="font-mono text-[15px]"
              style={{ color }}
            >
              {branch.name}
            </span>
          </div>
          {isActive ? (
            <span className="rounded-full border border-[var(--v3-primary)] px-2 py-0.5 text-[12px] text-[var(--v3-primary)]">
              当前分支
            </span>
          ) : (
            <ChevronRight
              size={16}
              strokeWidth={1.5}
              aria-hidden="true"
              className="text-[var(--v3-text-muted)]"
            />
          )}
        </div>

        <div className="mt-4 flex gap-6">
          <div className="flex flex-col">
            <span className="text-[28px] font-semibold leading-none text-[var(--v3-text-strong)]">
              {totalCount}
            </span>
            <span className="mt-1 text-[12px] text-[var(--v3-text-muted)]">
              任务总数
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[28px] font-semibold leading-none text-[var(--v3-text-strong)]">
              {inProgressCount}
            </span>
            <span className="mt-1 text-[12px] text-[var(--v3-text-muted)]">
              进行中
            </span>
          </div>
        </div>

        {lastActivity ? (
          <div className="mt-4 text-[12px] text-[var(--v3-text-muted)]">
            最近活动 · {formatRelativeTime(lastActivity)}
          </div>
        ) : null}
      </button>
    </V3Card>
  );
}
