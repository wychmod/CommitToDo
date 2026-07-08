import {
  ChartNoAxesColumnIncreasing,
  ChevronDown,
  GitBranch,
  GitCommitHorizontal,
  House,
  Package,
  Search,
  Settings,
  SquareCheckBig,
} from 'lucide-react';

import { repositoryNavItems } from './workbench-demo-data';

const iconMap: Record<string, React.ElementType> = {
  house: House,
  'square-check': SquareCheckBig,
  'git-branch': GitBranch,
  'git-commit': GitCommitHorizontal,
  'chart-column': ChartNoAxesColumnIncreasing,
  search: Search,
  settings: Settings,
};

export function RepositoryColumn(): JSX.Element {
  return (
    <div className="flex w-[195px] shrink-0 flex-col border-r border-[var(--v3-border)] px-4 py-4">
      <span className="mb-3 text-[12px] font-medium text-[var(--v3-text-strong)]">
        Repository
      </span>

      <button
        type="button"
        className="mb-5 flex h-8 items-center gap-2 rounded-md border border-[var(--v3-border)] px-2 text-[12px] text-[var(--v3-text)] transition-colors hover:bg-[var(--v3-control)]"
      >
        <Package size={16} strokeWidth={1.5} aria-hidden="true" />
        <span className="font-mono">demo-repo</span>
        <ChevronDown size={14} strokeWidth={1.5} className="ml-auto" aria-hidden="true" />
      </button>

      <nav className="flex flex-col gap-0.5" aria-label="仓库导航">
        {repositoryNavItems.map((item) => {
          const Icon = iconMap[item.icon] ?? House;
          return (
            <button
              key={item.id}
              type="button"
              className={`relative flex h-[34px] items-center gap-[10px] rounded-md px-2 text-[12px] transition-colors ${
                item.active
                  ? 'bg-[var(--v3-selected)] text-[var(--v3-primary)]'
                  : 'text-[var(--v3-text-secondary)] hover:bg-[var(--v3-control)] hover:text-[var(--v3-text)]'
              }`}
            >
              {item.active && (
                <span
                  className="absolute left-0 h-4 w-[3px] rounded-r-full bg-[var(--v3-primary)]"
                  aria-hidden="true"
                />
              )}
              <Icon
                size={16}
                strokeWidth={1.5}
                className={item.active ? 'text-[var(--v3-primary)]' : ''}
                aria-hidden="true"
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
