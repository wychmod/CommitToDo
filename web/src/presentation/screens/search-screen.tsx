import { Search } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../../core/hooks/use-is-mobile';
import { AppInput } from '../components/common/app-input';
import { BranchIndicator } from '../components/branch/branch-indicator';
import { TaskCard } from '../components/task/task-card';
import { RepositoryCard } from '../components/repository/repository-card';
import { useSearchStore } from '../stores/search-store';

export function SearchScreen(): JSX.Element {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLInputElement>(null);
  const { query, tasks, branches, repositories, isLoading, error, setQuery, search, clear } =
    useSearchStore();

  useEffect(() => {
    if (isMobile && inputRef.current) {
      inputRef.current.focus();
    }
    return () => {
      clear();
    };
  }, [isMobile, clear]);

  const handleChange = (value: string) => {
    setQuery(value);
    if (value.trim()) {
      void search(value);
    } else {
      clear();
    }
  };

  return (
    <div className="flex flex-col gap-md">
      <h1 className="text-headline font-semibold text-ink">搜索</h1>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <AppInput
          ref={inputRef}
          placeholder="搜索任务、分支、仓库…"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {error ? (
        <div className="rounded-md border border-error bg-error/10 p-md text-body text-error">
          {error}
        </div>
      ) : null}

      {isLoading ? <p className="text-body text-ink-muted">搜索中…</p> : null}

      {query.trim() && !isLoading ? (
        <div className="flex flex-col gap-md">
          {tasks.length > 0 && (
            <section>
              <h2 className="mb-xs text-eyebrow text-ink-muted">任务</h2>
              <div className="flex flex-col gap-xs">
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => navigate(`/task/${task.id}`)}
                  />
                ))}
              </div>
            </section>
          )}
          {branches.length > 0 && (
            <section>
              <h2 className="mb-xs text-eyebrow text-ink-muted">分支</h2>
              <div className="flex flex-col gap-xs">
                {branches.map((branch) => (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => navigate(`/repository/${branch.repositoryId}`)}
                    className="rounded-lg border border-hairline bg-surface-1 p-md text-left hover:bg-surface-2"
                  >
                    <BranchIndicator
                      name={branch.name}
                      color={branch.color}
                      isMain={branch.isMain}
                    />
                  </button>
                ))}
              </div>
            </section>
          )}
          {repositories.length > 0 && (
            <section>
              <h2 className="mb-xs text-eyebrow text-ink-muted">仓库</h2>
              <div className="grid grid-cols-1 gap-xs sm:grid-cols-2">
                {repositories.map((repo) => (
                  <RepositoryCard
                    key={repo.id}
                    repository={repo}
                    onClick={() => navigate(`/repository/${repo.id}`)}
                  />
                ))}
              </div>
            </section>
          )}
          {tasks.length === 0 && branches.length === 0 && repositories.length === 0 ? (
            <p className="py-lg text-center text-body text-ink-muted">未找到匹配结果</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
