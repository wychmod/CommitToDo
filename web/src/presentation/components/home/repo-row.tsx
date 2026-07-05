import { GitBranch, Trash2 } from 'lucide-react';
import { Repository } from '../../../domain/entities/repository';
import { formatRelativeTime } from '../../../core/utils/formatters';
import { cn } from '../../../core/utils/formatters';

export interface RepoRowProps {
  repository: Repository;
  onClick?: () => void;
  onDelete?: () => void;
}

/**
 * Premium horizontal-row variant of a repository, used only on the home
 * screen. Kept separate from RepositoryCard so the original list/grid in
 * repository-list.tsx stays untouched.
 */
export function RepoRow({ repository, onClick, onDelete }: RepoRowProps): JSX.Element {
  const shortId = repository.id.replace(/-/g, '').slice(0, 7).toUpperCase();

  return (
    <div
      className={cn(
        'group flex items-center gap-md rounded-lg border border-hairline bg-surface-1 px-md py-sm hud-card'
      )}
    >
      {/* Color swatch + brand mark */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: repository.color }}
        aria-hidden
      >
        <GitBranch className="h-5 w-5 text-white" />
      </div>

      {/* Identity */}
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 flex-col items-start text-left"
      >
        <span className="truncate text-card-title font-medium text-ink">
          {repository.name}
        </span>
        <span className="mt-xxs flex items-center gap-xs text-mono-sm text-ink-subtle">
          <span className="tabular">#{shortId}</span>
          <span className="text-ink-tertiary">·</span>
          <span className="inline-flex items-center gap-xxs">
            <GitBranch className="h-3 w-3" aria-hidden />
            <span>main</span>
          </span>
          {repository.isArchived ? (
            <>
              <span className="text-ink-tertiary">·</span>
              <span className="text-warning">已归档</span>
            </>
          ) : null}
        </span>
      </button>

      {/* Right-side meta */}
      <div className="hidden items-center gap-md text-mono-sm text-ink-subtle mobile:flex">
        <span className="tabular text-ink-muted">
          {formatRelativeTime(repository.updatedAt)}
        </span>
      </div>

      {/* Trailing delete */}
      {onDelete ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="ml-xs flex h-8 w-8 items-center justify-center rounded-md text-ink-subtle transition-colors hover:bg-error/10 hover:text-error"
          aria-label="删除仓库"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
