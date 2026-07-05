import { Repository } from '../../../domain/entities/repository';
import { RepositoryCard } from './repository-card';

export interface RepositoryListProps {
  repositories: Repository[];
  onItemClick?: (repository: Repository) => void;
  onItemDelete?: (repository: Repository) => void;
}

export function RepositoryList({ repositories, onItemClick, onItemDelete }: RepositoryListProps): JSX.Element {
  if (repositories.length === 0) {
    return (
      <p className="py-lg text-center text-body text-ink-muted">暂无仓库</p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-xs sm:grid-cols-2 lg:grid-cols-3">
      {repositories.map((repository) => (
        <RepositoryCard
          key={repository.id}
          repository={repository}
          onClick={() => onItemClick?.(repository)}
          onDelete={() => onItemDelete?.(repository)}
        />
      ))}
    </div>
  );
}
