import { Plus } from 'lucide-react';

import { branchList } from './workbench-demo-data';

export function BranchColumn(): JSX.Element {
  return (
    <div className="flex w-[146px] shrink-0 flex-col border-r border-[var(--v3-border)] px-5 py-4">
      <span className="mb-3 text-[12px] font-medium text-[var(--v3-text-strong)]">
        Branch
      </span>

      <div className="flex flex-col gap-0.5">
        {branchList.map((branch) => (
          <button
            key={branch.name}
            type="button"
            className="flex h-[34px] items-center justify-between rounded-md px-1 text-[12px] transition-colors hover:bg-[var(--v3-control)]"
          >
            <span className="flex items-center gap-2 font-mono">
              <span
                className="h-[6px] w-[6px] rounded-full"
                style={{ backgroundColor: branch.color }}
                aria-hidden="true"
              />
              <span
                className={
                  branch.name === 'main'
                    ? 'text-[var(--v3-primary)]'
                    : 'text-[var(--v3-text)]'
                }
              >
                {branch.name}
              </span>
            </span>
            <span className="text-[10px] text-[var(--v3-text-muted)]">
              {branch.count}
            </span>
          </button>
        ))}

        <button
          type="button"
          className="flex h-[34px] items-center gap-2 rounded-md px-1 text-[12px] text-[var(--v3-text-muted)] transition-colors hover:bg-[var(--v3-control)] hover:text-[var(--v3-text)]"
        >
          <Plus size={14} strokeWidth={1.5} aria-hidden="true" />
          <span>新建分支</span>
        </button>
      </div>
    </div>
  );
}
