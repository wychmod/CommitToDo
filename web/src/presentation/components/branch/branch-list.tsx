import { Branch } from '../../../domain/entities/branch';
import { BranchIndicator } from './branch-indicator';

export interface BranchListProps {
  branches: Branch[];
  activeBranchId: string | null;
  onSelect: (branch: Branch) => void;
}

export function BranchList({ branches, activeBranchId, onSelect }: BranchListProps): JSX.Element {
  if (branches.length === 0) {
    return (
      <p className="py-lg text-center text-body text-ink-muted">暂无分支</p>
    );
  }

  return (
    <div className="flex flex-col gap-micro">
      {branches.map((branch) => {
        const isActive = branch.id === activeBranchId;
        return (
          <button
            key={branch.id}
            type="button"
            onClick={() => onSelect(branch)}
            className={`relative flex items-center justify-between rounded-md px-sm py-xs text-left transition-colors ${
              isActive
                ? 'bg-surface-1 text-ink'
                : 'text-ink-muted hover:bg-surface-1 hover:text-ink'
            }`}
          >
            {isActive ? (
              <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
            ) : null}
            <BranchIndicator
              name={branch.name}
              color={branch.color}
              isMain={branch.isMain}
            />
          </button>
        );
      })}
    </div>
  );
}
