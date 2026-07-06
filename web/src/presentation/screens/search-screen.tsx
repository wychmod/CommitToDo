import { Search } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../../core/hooks/use-is-mobile';
import { AppInput } from '../components/common/app-input';
import { TaskList } from '../components/tasks/task-list';
import { RepositoryRow } from '../components/repository/repository-row';
import { useSearchStore } from '../stores/search-store';
import { useCommandPaletteStore } from '../components/command-palette/command-palette.store';

export function SearchScreen(): JSX.Element {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLInputElement>(null);
  const openPalette = useCommandPaletteStore((s) => s.openPalette);
  const {
    query,
    tasks,
    branches,
    repositories,
    isLoading,
    error,
    setQuery,
    search,
    clear,
  } = useSearchStore();

  useEffect(() => {
    if (isMobile && inputRef.current) {
      inputRef.current.focus();
    }
    return () => {
      clear();
    };
  }, [isMobile, clear]);

  const handleChange = (value: string): void => {
    setQuery(value);
    if (value.trim()) {
      void search(value);
    } else {
      clear();
    }
  };

  return (
    <div className="work-main">
      <div className="work-main-pad">
        <header className="flex flex-col gap-xs">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-subtle">
            Search
          </span>
          <h1 className="text-[22px] font-semibold leading-tight text-ink">
            全局搜索
          </h1>
          <p className="text-[13px] text-ink-muted">
            按任务标题、分支名或仓库名搜索。也可按{' '}
            <button
              type="button"
              onClick={openPalette}
              className="font-mono text-primary underline-offset-4 hover:underline"
            >
              ⌘K
            </button>{' '}
            打开命令面板。
          </p>
        </header>

        <section className="panel">
          <header className="panel-header">
            <span className="panel-title">
              <Search className="h-3.5 w-3.5 text-primary" aria-hidden /> 查询
            </span>
            <span className="panel-meta">本地索引</span>
          </header>
          <div className="panel-body">
            <AppInput
              ref={inputRef}
              placeholder="搜索任务、分支、仓库…"
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              autoFocus={isMobile}
            />
            {error ? (
              <p className="text-body-sm text-error">{error}</p>
            ) : null}
            {isLoading ? (
              <p className="text-body-sm text-ink-muted">搜索中…</p>
            ) : null}
          </div>
        </section>

        {query.trim() && !isLoading ? (
          <div className="flex flex-col gap-md">
            {tasks.length > 0 && (
              <section className="flex flex-col gap-xs">
                <h2 className="section-heading">
                  任务
                  <span className="section-heading-meta">/{tasks.length}</span>
                </h2>
                <TaskList
                  tasks={tasks}
                  onItemClick={(task) => {
                    if (task.branchId) {
                      const url = task.branchId
                        ? `/repository?branch=${task.branchId}&task=${task.id}`
                        : `/workspace`;
                      navigate(url);
                    }
                  }}
                />
              </section>
            )}

            {branches.length > 0 && (
              <section className="flex flex-col gap-xs">
                <h2 className="section-heading">
                  分支
                  <span className="section-heading-meta">/{branches.length}</span>
                </h2>
                <ul className="flex flex-col gap-xs">
                  {branches.map((b) => (
                    <li
                      key={b.id}
                      className="task-row"
                      onClick={() => navigate(`/repository/${b.repositoryId}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          navigate(`/repository/${b.repositoryId}`);
                        }
                      }}
                    >
                      <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: b.color }} />
                      <span className="task-row-title">{b.name}</span>
                      <span className="task-row-cell font-mono text-[11px]">
                        {b.isMain ? 'main' : 'feature'}
                      </span>
                      <span className="task-row-cell font-mono text-[11px] text-ink-muted">
                        #{b.id.slice(0, 7)}
                      </span>
                      <span />
                      <span />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {repositories.length > 0 && (
              <section className="flex flex-col gap-xs">
                <h2 className="section-heading">
                  仓库
                  <span className="section-heading-meta">
                    /{repositories.length}
                  </span>
                </h2>
                <div className="flex flex-col gap-xs">
                  {repositories.map((repo) => (
                    <RepositoryRow key={repo.id} repository={repo} />
                  ))}
                </div>
              </section>
            )}

            {tasks.length === 0 &&
              branches.length === 0 &&
              repositories.length === 0 ? (
                <p className="empty-state">
                  <span className="empty-state-title">未找到匹配结果</span>
                  <span className="empty-state-caption">
                    调整关键词或使用命令面板执行动作。
                  </span>
                </p>
              ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
