import { GitBranch, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Repository } from '../../../domain/entities/repository';
import { formatRelativeTime } from '../../../core/utils/formatters';
import { cn } from '../../../core/utils/formatters';

export interface RepositoryRowProps {
  repository: Repository;
  branchCount?: number;
  taskCount?: number;
  onDelete?: () => void;
}

/**
 * Compact, hover-affordant repository row used inside the workspace overview.
 */
export function RepositoryRow({
  repository,
  branchCount,
  taskCount,
  onDelete,
}: RepositoryRowProps): JSX.Element {
  const navigate = useNavigate();
  return (
    <div
      className={cn(
        'group flex items-center gap-md rounded-lg border border-border bg-surface px-md py-sm transition-colors hover:border-border-strong hover:bg-surface-soft'
      )}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: repository.color }}
        aria-hidden
      >
        <GitBranch className="h-4 w-4 text-white" aria-hidden />
      </div>
      <button
        type="button"
        onClick={() => navigate(`/repository/${repository.id}`)}
        className="flex min-w-0 flex-1 flex-col items-start text-left"
      >
        <span className="truncate text-card-title font-medium text-ink">
          {repository.name}
        </span>
        <span className="mt-xxs flex items-center gap-xs font-mono text-[11px] text-ink-subtle">
          <span className="tabular">#{repository.id.slice(0, 7).toUpperCase()}</span>
          <span className="text-ink-tertiary">·</span>
          <span>{branchCount ?? 0} 分支</span>
          <span className="text-ink-tertiary">·</span>
          <span>{taskCount ?? 0} 任务</span>
          {repository.isArchived ? (
            <>
              <span className="text-ink-tertiary">·</span>
              <span className="text-warning">已归档</span>
            </>
          ) : null}
        </span>
      </button>
      <span className="hidden font-mono text-[11px] text-ink-subtle tablet:inline-block">
        更新 {formatRelativeTime(repository.updatedAt)}
      </span>
      {onDelete ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="删除仓库"
          className="ml-xs flex h-8 w-8 items-center justify-center rounded-md text-ink-subtle transition-colors hover:bg-error-soft hover:text-error"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
