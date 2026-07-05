import { Trash2 } from 'lucide-react';
import { Repository } from '../../../domain/entities/repository';
import { AppIcon, AppIconName } from '../../icons/app-icons';

export interface RepositoryCardProps {
  repository: Repository;
  onClick?: () => void;
  onDelete?: () => void;
}

export function RepositoryCard({ repository, onClick, onDelete }: RepositoryCardProps): JSX.Element {
  return (
    <div
      className="group relative flex w-full flex-col gap-xs rounded-lg border border-hairline bg-surface-1 p-md text-left transition-colors hover:bg-surface-2"
    >
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-xs text-left"
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: repository.color }}
        >
          <AppIcon
            name={AppIconName.repository}
            className="h-4 w-4 text-white"
          />
        </div>
        <span className="text-card-title font-medium text-ink">
          {repository.name}
        </span>
      </button>
      <div className="flex items-center gap-sm text-mono-sm text-ink-muted">
        <span>#{repository.id.slice(0, 7)}</span>
        {repository.isArchived ? <span>已归档</span> : null}
        {onDelete ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-subtle opacity-0 transition-opacity hover:bg-surface-3 hover:text-error group-hover:opacity-100"
            aria-label="删除仓库"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
