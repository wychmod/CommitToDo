import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { container } from '../../core/di/injection-container';
import { ITaskRepository } from '../../domain/repositories/i-task-repository';
import { Task } from '../../domain/entities/task';
import { TaskList } from '../components/tasks/task-list';
import { AppInput } from '../components/common/app-input';
import { Search } from 'lucide-react';
import { useRepositoryStore } from '../stores/repository-store';

/**
 * Per-repository search page. Filters tasks against the current repository
 * only; falls back to the workspace-wide search if there's no repository in
 * scope.
 */
export function RepoSearchScreen(): JSX.Element {
  const { id: repoId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Task[]>([]);
  const { repository, branches, loadData } = useRepositoryStore();

  useEffect(() => {
    if (repoId) void loadData(repoId);
  }, [repoId, loadData]);

  useEffect(() => {
    let cancelled = false;
    const trimmed = query.trim();
    if (!trimmed || !repository?.id) {
      setResults([]);
      return;
    }
    (async (): Promise<void> => {
      const taskRepo = container.resolve<ITaskRepository>('ITaskRepository');
      const matches = await taskRepo.searchInRepository(repository.id, trimmed);
      if (!cancelled) setResults(matches);
    })();
    return () => {
      cancelled = true;
    };
  }, [query, repository?.id]);

  const activeBranchName = useMemo(
    () => branches.find((b) => b.id === repository?.id)?.name ?? null,
    [branches, repository?.id]
  );
  void activeBranchName;

  return (
    <div className="work-main">
      <div className="work-main-pad page-container">
        <header className="flex flex-col gap-xs">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-subtle">
            In-repo Search
          </span>
          <h1 className="text-[22px] font-semibold leading-tight text-ink">
            在 {repository?.name ?? '当前仓库'} 内搜索
          </h1>
          <p className="text-[13px] text-ink-muted">
            按任务标题或描述匹配。结果会点击进入任务详情抽屉。
          </p>
        </header>

        <section className="panel">
          <header className="panel-header">
            <span className="panel-title">
              <Search className="h-3.5 w-3.5 text-primary" aria-hidden /> 查询
            </span>
            <span className="panel-meta">本仓库索引</span>
          </header>
          <div className="panel-body">
            <AppInput
              placeholder="任务标题 / 描述…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
        </section>

        {query.trim() && results.length === 0 ? (
          <p className="empty-state">
            <span className="empty-state-title">没有匹配的任务</span>
            <span className="empty-state-caption">
              试试把关键词改短，或先去工作台创建新任务。
            </span>
          </p>
        ) : (
          <TaskList
            tasks={results}
            branchName={branches[0]?.name ?? null}
            onItemClick={(task) =>
              task.branchId &&
              navigate(
                `/repository/${repository?.id}?branch=${task.branchId}&task=${task.id}`
              )
            }
          />
        )}
      </div>
    </div>
  );
}
