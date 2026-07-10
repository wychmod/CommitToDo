import * as React from 'react';

import { cn } from '@/core/utils/formatters';
import { Repository } from '@/domain/entities/repository';
import { Branch } from '@/domain/entities/branch';
import {
  InsightsRange,
  InsightsScope,
} from '@/presentation/stores/insights-store';

export interface ScopeFiltersProps {
  scope: InsightsScope;
  repositories: Repository[];
  branches: Branch[];
  onScopeChange: (scope: Partial<InsightsScope>) => void;
  className?: string;
}

const RANGE_OPTIONS: { value: InsightsRange; label: string }[] = [
  { value: '90d', label: '过去 90 天' },
  { value: '12m', label: '过去 12 个月' },
  { value: 'year', label: '今年' },
  { value: 'custom', label: '自定义' },
];

export function ScopeFilters({
  scope,
  repositories,
  branches,
  onScopeChange,
  className,
}: ScopeFiltersProps): JSX.Element {
  const isAllRepositories = !scope.repositoryId;

  const handleRepositoryChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ): void => {
    const value = event.target.value;
    onScopeChange({
      repositoryId: value === 'all' ? undefined : value,
      branchId: undefined,
    });
  };

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2',
        className
      )}
      aria-label="洞察范围筛选"
    >
      <div className="inline-flex h-[40px] overflow-hidden rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)]">
        <button
          type="button"
          onClick={() =>
            onScopeChange({ repositoryId: undefined, branchId: undefined })
          }
          className={cn(
            'px-4 text-[13px] font-medium transition-colors',
            isAllRepositories
              ? 'bg-[var(--v3-primary)] text-[var(--v3-text-on-primary)]'
              : 'text-[var(--v3-text-secondary)] hover:bg-[var(--v3-control)]'
          )}
          aria-pressed={isAllRepositories}
        >
          全部仓库
        </button>
        <button
          type="button"
          onClick={() =>
            onScopeChange({
              repositoryId: repositories[0]?.id,
              branchId: undefined,
            })
          }
          className={cn(
            'px-4 text-[13px] font-medium transition-colors',
            !isAllRepositories
              ? 'bg-[var(--v3-primary)] text-[var(--v3-text-on-primary)]'
              : 'text-[var(--v3-text-secondary)] hover:bg-[var(--v3-control)]'
          )}
          aria-pressed={!isAllRepositories}
        >
          指定仓库
        </button>
      </div>

      {!isAllRepositories ? (
        <select
          value={scope.repositoryId ?? 'all'}
          onChange={handleRepositoryChange}
          aria-label="选择仓库"
          className="h-[40px] min-w-[140px] rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-3 text-[13px] text-[var(--v3-text)] outline-none focus-visible:[box-shadow:var(--v3-focus-ring)]"
        >
          <option value="all">选择仓库…</option>
          {repositories.map((repo) => (
            <option key={repo.id} value={repo.id}>
              {repo.name}
            </option>
          ))}
        </select>
      ) : null}

      <select
        value={scope.range}
        onChange={(e) =>
          onScopeChange({ range: e.target.value as InsightsRange })
        }
        aria-label="时间范围"
        className="h-[40px] w-[132px] rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-3 text-[13px] text-[var(--v3-text)] outline-none focus-visible:[box-shadow:var(--v3-focus-ring)]"
      >
        {RANGE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <select
        value={scope.branchId ?? 'all'}
        onChange={(e) =>
          onScopeChange({
            branchId:
              e.target.value === 'all' ? undefined : e.target.value,
          })
        }
        aria-label="分支"
        className="h-[40px] w-[116px] rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-3 text-[13px] text-[var(--v3-text)] outline-none focus-visible:[box-shadow:var(--v3-focus-ring)]"
      >
        <option value="all">全部分支</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
    </div>
  );
}
