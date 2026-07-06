import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { container } from '../../core/di/injection-container';
import { ICommitRepository } from '../../domain/repositories/i-commit-repository';
import { Commit } from '../../domain/entities/commit';
import { useRepositoryStore } from '../stores/repository-store';
import { CommitTimeline } from '../components/tasks/commit-timeline';

/**
 * Per-repository Commits tab. Surfaces the branch selector at the top so
 * users can pivot between commit timelines quickly without leaving the page.
 */
export function CommitsScreen(): JSX.Element {
  const { repository, branches, isLoading, loadData } = useRepositoryStore();

  const [commitsByBranch, setCommitsByBranch] = useState<Commit[]>([]);
  const [commitsLoading, setCommitsLoading] = useState(false);
  const [filterBranchId, setFilterBranchId] = useState<string | 'all'>('all');

  useEffect(() => {
    if (repository?.id) void loadData(repository.id);
    else if (useRepositoryStore.getState().repository?.id) {
      void loadData(useRepositoryStore.getState().repository!.id);
    }
  }, [repository?.id, loadData]);

  useEffect(() => {
    let cancelled = false;
    (async (): Promise<void> => {
      if (branches.length === 0) {
        setCommitsByBranch([]);
        return;
      }
      setCommitsLoading(true);
      const repo = container.resolve<ICommitRepository>('ICommitRepository');
      const lists = await Promise.all(
        branches.map((b) => repo.getByBranchId(b.id))
      );
      if (cancelled) return;
      setCommitsByBranch(lists.flat());
      setCommitsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [branches]);

  const branchIdsForView = useMemo(() => {
    if (filterBranchId === 'all') return branches.map((b) => b.id);
    return [filterBranchId];
  }, [filterBranchId, branches]);

  if (isLoading && !repository) {
    return (
      <div className="work-main">
        <div className="work-main-pad">
          <div className="empty-state">
            <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
            <span className="empty-state-title">正在加载…</span>
          </div>
        </div>
      </div>
    );
  }

  if (!repository) {
    return (
      <div className="work-main">
        <div className="work-main-pad">
          <div className="empty-state">
            <span className="empty-state-title">仓库未加载</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="work-main">
      <div className="work-main-pad page-container">
        <header className="flex flex-wrap items-end justify-between gap-md">
          <div className="flex flex-col gap-xs">
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-subtle">
              Commits
            </span>
            <h1 className="text-[22px] font-semibold leading-tight text-ink">
              {repository.name} · 提交记录
            </h1>
            <p className="font-mono text-[12px] text-ink-muted">
              {commitsByBranch.length} 条 · {branches.length} 个分支
            </p>
          </div>
          <div className="flex items-center gap-xs">
            <select
              value={filterBranchId}
              onChange={(e) => setFilterBranchId(e.target.value as string)}
              className="h-9 rounded-md border border-border bg-surface px-2 text-body text-ink outline-none focus-visible:border-primary"
            >
              <option value="all">全部分支</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </header>

        {commitsLoading ? (
          <div className="empty-state">
            <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
            <span className="empty-state-title">正在加载提交…</span>
          </div>
        ) : (
          <CommitTimeline
            branchIds={branchIdsForView}
            title="提交时间线"
          />
        )}
      </div>
    </div>
  );
}
