import '@/core/theme/v3-tokens.css';

import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BarChart3, GitGraph, ListTodo } from 'lucide-react';

import { V3AppShell, V3Button, V3Card } from '@/presentation/components/v3';
import { cn } from '@/core/utils/formatters';
import { Commit } from '@/domain/entities/commit';
import {
  useInsightsStore,
  InsightsTab,
  InsightsRange,
} from '@/presentation/stores/insights-store';
import { useHomeStore } from '@/presentation/stores/home-store';

import { ScopeFilters } from './scope-filters';
import { ActivityTab } from './activity-tab';
import { GraphTab } from './graph-tab';
import { RhythmTab } from './rhythm-tab';
import { CommitDetailCard } from './commit-detail-card';
import { RhythmSummaryCard } from './rhythm-summary-card';

const TABS: { id: InsightsTab; label: string; icon: typeof GitGraph }[] = [
  { id: 'activity', label: '活动', icon: ListTodo },
  { id: 'graph', label: '图谱', icon: GitGraph },
  { id: 'heatmap', label: '节奏', icon: BarChart3 },
];

function parseTab(value: string | null): InsightsTab {
  switch (value) {
    case 'activity':
    case 'graph':
    case 'heatmap':
      return value;
    default:
      return 'graph';
  }
}

function parseRange(value: string | null): InsightsRange {
  switch (value) {
    case '90d':
    case '12m':
    case 'year':
    case 'custom':
      return value;
    default:
      return '90d';
  }
}

export function InsightsScreen(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [toastOpen, setToastOpen] = React.useState(false);

  const {
    repositories,
    branches,
    commits,
    tasks,
    selectedCommit,
    isLoading,
    scope,
    setScope,
    selectCommit,
    loadForScope,
    loadRepositories,
  } = useInsightsStore();

  const homeRepositories = useHomeStore((s) => s.repositories);
  const loadHomeRepositories = useHomeStore((s) => s.load);

  React.useEffect(() => {
    void loadHomeRepositories();
  }, [loadHomeRepositories]);

  React.useEffect(() => {
    const repositoryId = searchParams.get('repository') ?? undefined;
    const branchId = searchParams.get('branch') ?? undefined;
    const tab = parseTab(searchParams.get('tab'));
    const range = parseRange(searchParams.get('range'));
    const commitHash = searchParams.get('commit');

    setScope({ repositoryId, branchId, tab, range });

    void loadForScope({
      repositoryId,
      branchId,
      tab,
      range,
    }).then(() => {
      if (commitHash) {
        const commit = useInsightsStore
          .getState()
          .commits.find((c) => c.id.startsWith(commitHash));
        if (commit) selectCommit(commit);
      }
    });
  }, [searchParams, setScope, loadForScope, selectCommit]);

  React.useEffect(() => {
    void loadRepositories();
  }, [loadRepositories]);

  const updateSearchParams = React.useCallback(
    (updates: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(updates)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const handleScopeChange = React.useCallback(
    (partial: Partial<typeof scope>) => {
      const next = { ...scope, ...partial };
      setScope(partial);
      updateSearchParams({
        repository: next.repositoryId,
        branch: next.branchId,
        tab: next.tab,
        range: next.range,
      });
    },
    [scope, setScope, updateSearchParams]
  );

  const handleTabChange = React.useCallback(
    (tab: InsightsTab) => {
      handleScopeChange({ tab });
    },
    [handleScopeChange]
  );

  const handleSelectCommit = React.useCallback(
    (commit: Commit) => {
      selectCommit(commit);
      updateSearchParams({ commit: commit.id.slice(0, 7) });
    },
    [selectCommit, updateSearchParams]
  );

  const handleViewTasks = React.useCallback(
    (commit: Commit) => {
      const branch = branches.find((b) => b.id === commit.branchId);
      const repositoryId = branch?.repositoryId;
      if (!repositoryId) return;
      navigate(`/repository/${repositoryId}/tasks?commit=${commit.id.slice(0, 7)}`);
    },
    [branches, navigate]
  );

  const handleCopyHash = React.useCallback(() => {
    setToastOpen(true);
  }, []);

  const hasNoCommitsAtAll = !isLoading && commits.length === 0 && !scope.repositoryId && scope.range === '90d';
  const hasNoScopeData = !isLoading && commits.length === 0 && (scope.repositoryId || scope.branchId || scope.range !== '90d');

  return (
    <V3AppShell
      currentRepositoryId={scope.repositoryId}
      recentRepositories={homeRepositories}
    >
      <div className="min-h-[calc(100vh-68px-48px)] bg-[var(--v3-bg)] px-5 py-6 desktop:px-8">
        <div className="flex flex-col gap-5 desktop:flex-row desktop:gap-6">
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            <header className="flex flex-col gap-4 tablet:flex-row tablet:items-end tablet:justify-between">
              <div>
                <span className="text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--v3-primary)]">
                  Insights
                </span>
                <h1 className="mt-1 text-[32px] font-bold leading-tight text-[var(--v3-text-strong)] desktop:text-[40px]">
                  洞察
                </h1>
                <p className="mt-1 text-[14px] text-[var(--v3-text-secondary)]">
                  回顾提交、理解分支演进，并看见长期节奏。
                </p>
              </div>

              <ScopeFilters
                scope={scope}
                repositories={repositories}
                branches={branches}
                onScopeChange={handleScopeChange}
              />
            </header>

            <nav aria-label="洞察标签">
              <div className="flex border-b border-[var(--v3-divider)]" role="tablist">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = scope.tab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => handleTabChange(tab.id)}
                      className={cn(
                        'relative flex h-[38px] items-center gap-2 px-4 text-[14px] font-medium transition-colors',
                        isActive
                          ? 'text-[var(--v3-primary)]'
                          : 'text-[var(--v3-text-secondary)] hover:text-[var(--v3-text-strong)]'
                      )}
                    >
                      <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
                      {tab.label}
                      {isActive ? (
                        <span
                          className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full bg-[var(--v3-primary)]"
                          aria-hidden="true"
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </nav>

            {isLoading ? (
              <V3Card className="flex h-[400px] items-center justify-center">
                <span className="text-[14px] text-[var(--v3-text-muted)]">
                  正在加载洞察数据…
                </span>
              </V3Card>
            ) : hasNoCommitsAtAll ? (
              <EmptyAllCommits />
            ) : hasNoScopeData ? (
              <EmptyScope onViewAll={() => handleScopeChange({ repositoryId: undefined, branchId: undefined, range: '90d' })} />
            ) : (
              <div role="tabpanel" aria-label={`${tabLabel(scope.tab)} 面板`}>
                {scope.tab === 'activity' ? (
                  <ActivityTab
                    commits={commits}
                    branches={branches}
                    repositories={repositories}
                    selectedCommit={selectedCommit}
                    onSelectCommit={handleSelectCommit}
                  />
                ) : scope.tab === 'graph' ? (
                  <GraphTab
                    commits={commits}
                    branches={branches}
                    repositories={repositories}
                    selectedCommit={selectedCommit}
                    onSelectCommit={handleSelectCommit}
                  />
                ) : (
                  <RhythmTab
                    commits={commits}
                    tasks={tasks}
                    branches={branches}
                    range={scope.range}
                    onCellClick={() => handleTabChange('activity')}
                  />
                )}
              </div>
            )}
          </div>

          <aside className="flex w-full flex-col gap-4 desktop:w-[340px] desktop:shrink-0">
            <CommitDetailCard
              commit={selectedCommit}
              tasks={tasks}
              branches={branches}
              repositories={repositories}
              onViewTasks={handleViewTasks}
              onCopyHash={handleCopyHash}
            />
            <RhythmSummaryCard
              range={scope.range}
              tasks={tasks}
              commits={commits}
              onClick={() => handleTabChange('heatmap')}
            />
          </aside>
        </div>
      </div>

      <ToastPrimitive.Root
        open={toastOpen}
        onOpenChange={setToastOpen}
        duration={2000}
        className="pointer-events-auto flex items-center gap-2 rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-card)] px-4 py-3 shadow-[var(--v3-shadow-panel)]"
      >
        <ToastPrimitive.Title className="text-[13px] text-[var(--v3-text-strong)]">
          提交哈希已复制
        </ToastPrimitive.Title>
      </ToastPrimitive.Root>
    </V3AppShell>
  );
}

function tabLabel(tab: InsightsTab): string {
  switch (tab) {
    case 'activity':
      return '活动';
    case 'graph':
      return '图谱';
    case 'heatmap':
      return '节奏';
  }
}

function EmptyAllCommits(): JSX.Element {
  const navigate = useNavigate();
  return (
    <V3Card className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="text-[16px] font-medium text-[var(--v3-text-strong)]">
        还没有提交
      </span>
      <span className="max-w-[280px] text-[13px] text-[var(--v3-text-secondary)]">
        完成任务后，提交记录、分支图谱和节奏会出现在这里。
      </span>
      <V3Button onClick={() => navigate('/workspace')} className="mt-2">
        去创建任务
      </V3Button>
    </V3Card>
  );
}

function EmptyScope({ onViewAll }: { onViewAll: () => void }): JSX.Element {
  return (
    <V3Card className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="text-[16px] font-medium text-[var(--v3-text-strong)]">
        这个范围还没有活动
      </span>
      <span className="max-w-[280px] text-[13px] text-[var(--v3-text-secondary)]">
        换一个仓库、分支或时间范围试试。
      </span>
      <V3Button onClick={onViewAll} className="mt-2">
        查看全部仓库
      </V3Button>
    </V3Card>
  );
}
