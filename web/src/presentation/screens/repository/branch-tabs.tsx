import * as React from 'react';

import { cn } from '@/core/utils/formatters';
import { Branch } from '@/domain/entities/branch';

export interface BranchTabsProps {
  branches: Branch[];
  activeBranchId: string | null;
  counts: Record<string, number>;
  onSelect: (branchId: string) => void;
  manageAction: React.ReactNode;
}

export function BranchTabs({
  branches,
  activeBranchId,
  counts,
  onSelect,
  manageAction,
}: BranchTabsProps): JSX.Element {
  return (
    <div className="flex h-[50px] items-center justify-between rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-card)] px-2">
      <div className="flex h-full items-center gap-1" role="tablist" aria-label="分支">
        {branches.map((branch) => (
          <button
            key={branch.id}
            type="button"
            role="tab"
            aria-selected={activeBranchId === branch.id}
            onClick={() => onSelect(branch.id)}
            className={cn(
              'relative flex h-[48px] items-center gap-2.5 px-[28px] text-[14px] transition-colors duration-(--v3-fast)',
              activeBranchId === branch.id
                ? 'font-semibold text-[var(--v3-text-strong)]'
                : 'text-[var(--v3-text-secondary)] hover:text-[var(--v3-text)]'
            )}
          >
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                branch.isMain && 'bg-[var(--v3-primary)]',
                branch.name.toLowerCase() === 'launch' && 'bg-[var(--v3-launch)]',
                branch.name.toLowerCase() === 'design' && 'bg-[var(--v3-design)]',
                !branch.isMain &&
                  branch.name.toLowerCase() !== 'launch' &&
                  branch.name.toLowerCase() !== 'design' &&
                  'bg-[var(--v3-text-muted)]'
              )}
              aria-hidden="true"
            />
            <span>{branch.name}</span>
            <span className="ml-0.5 text-[13px] text-[var(--v3-text-muted)]">
              {counts[branch.id] ?? 0}
            </span>
            {activeBranchId === branch.id ? (
              <span
                className="absolute bottom-0 left-2 right-2 h-[3px] rounded-t-full bg-[var(--v3-primary)]"
                aria-hidden="true"
              />
            ) : null}
          </button>
        ))}
      </div>

      {manageAction}
    </div>
  );
}
