import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Folder,
  Plus,
  GitBranch,
  ListTodo,
  CheckCircle2,
  CalendarCheck2,
} from 'lucide-react';
import { endOfDay, startOfDay, subDays } from 'date-fns';

import { useHomeStore } from '../stores/home-store';
import { AppButton } from '../components/common/app-button';
import {
  AppDialog,
  AppDialogContent,
  AppDialogDescription,
  AppDialogFooter,
  AppDialogHeader,
  AppDialogTitle,
} from '../components/common/app-dialog';
import { AppInput } from '../components/common/app-input';

import { RepositoryRow } from '../components/repository/repository-row';
import { container } from '../../core/di/injection-container';
import { ITaskRepository } from '../../domain/repositories/i-task-repository';
import { IBranchRepository } from '../../domain/repositories/i-branch-repository';
import { Task } from '../../domain/entities/task';
import { formatRelativeTime } from '../../core/utils/formatters';

interface WorkspaceStats {
  totalRepositories: number;
  activeToday: number;
  tasksCompletedWeek: number;
  pendingTasks: number;
}

interface RepositoryCounts {
  branchCount: number;
  taskCount: number;
}

const PAGE_TITLE = '工作台';
const PAGE_SUBTITLE = '今日焦点 · 最近仓库 · 本地保存';

export function HomeScreen(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    repositories,
    isLoading,
    error,
    load,
    createRepository,
    deleteRepository,
    clearError,
  } = useHomeStore();

  const [stats, setStats] = useState<WorkspaceStats>({
    totalRepositories: 0,
    activeToday: 0,
    tasksCompletedWeek: 0,
    pendingTasks: 0,
  });

  const [statsLoading, setStatsLoading] = useState(true);
  const [repositoryCounts, setRepositoryCounts] = useState<
    Record<string, RepositoryCounts>
  >({});
  const [isMac, setIsMac] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(
    searchParams.get('create') === '1'
  );
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (searchParams.get('create') === '1') {
      setIsCreateOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    setIsMac(/mac|iphone|ipad|ipod/i.test(navigator.platform));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async (): Promise<void> => {
      try {
        const taskRepo = container.resolve<ITaskRepository>('ITaskRepository');
        const branchRepo = container.resolve<IBranchRepository>('IBranchRepository');

        const startOfYesterday = startOfDay(subDays(new Date(), 0)).getTime();
        const startOfWeek = startOfDay(subDays(new Date(), 6)).getTime();
        const endOfToday = endOfDay(new Date()).getTime();

        const entries = await Promise.all(
          repositories.map((r) =>
            branchRepo.getByRepositoryId(r.id).then(async (branches) => {
              const all = await Promise.all(
                branches.map((b) => taskRepo.getByBranchId(b.id))
              );
              const tasksForRepo = all.flat();
              return {
                repositoryId: r.id,
                branchCount: branches.length,
                tasks: tasksForRepo,
              };
            })
          )
        );
        const allTasks: Task[] = entries.flatMap((entry) => entry.tasks);
        if (cancelled) return;
        setRepositoryCounts(
          Object.fromEntries(
            entries.map((entry) => [
              entry.repositoryId,
              {
                branchCount: entry.branchCount,
                taskCount: entry.tasks.length,
              },
            ])
          )
        );
        const isSameDay = (a: Date, b: Date): boolean =>
          a.toDateString() === b.toDateString();
        const today = new Date();
        const completed = allTasks.filter(
          (t) => t.completedAt && t.completedAt.getTime() >= startOfWeek
        );
        const activeToday = repositories.filter(
          (r) => r.updatedAt && isSameDay(new Date(r.updatedAt), today)
        ).length;
        const pending = allTasks.filter(
          (t) =>
            t.status !== 2 /*done*/ &&
            t.status !== 3 /*cancelled*/ &&
            (!t.completedAt || t.completedAt.getTime() < startOfYesterday ||
              (t.dueDate && t.dueDate.getTime() < endOfToday))
        ).length;

        setStats({
          totalRepositories: repositories.length,
          activeToday,
          tasksCompletedWeek: completed.length,
          pendingTasks: pending,
        });
        setStatsLoading(false);
      } catch {
        if (!cancelled) setStatsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repositories]);

  const recentRepositories = useMemo(() => {
    return [...repositories]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 5);
  }, [repositories]);

  const handleCreate = async (): Promise<void> => {
    const created = await createRepository(newName);
    if (created) {
      setNewName('');
      setIsCreateOpen(false);
    }
  };

  return (
    <div className="work-main">
      <div className="work-main-pad page-container">
        <header className="flex flex-col gap-xs">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-subtle">
            Workspace Overview
          </span>
          <h1 className="text-[22px] font-semibold leading-tight text-ink">
            {PAGE_TITLE}
          </h1>
          <p className="text-[13px] text-ink-muted">{PAGE_SUBTITLE}</p>
        </header>

        <section className="grid grid-cols-2 gap-sm tablet:grid-cols-4" aria-label="概览">
          <Stat
            label="仓库总数"
            value={stats.totalRepositories}
            icon={Folder}
            loading={statsLoading}
          />
          <Stat
            label="今日活跃"
            value={stats.activeToday}
            icon={GitBranch}
            loading={statsLoading}
          />
          <Stat
            label="本周完成"
            value={stats.tasksCompletedWeek}
            icon={CheckCircle2}
            tone="done"
            loading={statsLoading}
          />
          <Stat
            label="待处理任务"
            value={stats.pendingTasks}
            icon={ListTodo}
            tone="warn"
            loading={statsLoading}
          />
        </section>

        <section className="panel" aria-label="快捷动作">
          <header className="panel-header">
            <span className="panel-title">
              <Plus className="h-3.5 w-3.5 text-primary" aria-hidden /> 快捷动作
            </span>
          </header>
          <div className="panel-body">
            <div className="flex flex-wrap gap-sm">
              <AppButton onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4" /> 新建仓库
              </AppButton>
              <AppButton variant="secondary" onClick={() => navigate('/heatmap')}>
                <CalendarCheck2 className="h-4 w-4" /> 打开热力图
              </AppButton>
              <AppButton variant="secondary" onClick={() => navigate('/graph')}>
                <GitBranch className="h-4 w-4" /> 打开 Git Graph
              </AppButton>
              <AppButton variant="secondary" onClick={() => navigate('/search')}>
                搜索任务 / 仓库
              </AppButton>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-sm" aria-label="最近仓库">
          <div className="flex items-center justify-between">
            <h2 className="section-heading">
              最近仓库
              <span className="section-heading-meta">/{repositories.length} 个</span>
            </h2>
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="text-xs text-ink-muted underline-offset-4 hover:underline"
            >
              设置
            </button>
          </div>

          {error ? (
            <div className="rounded-md border border-error bg-error-soft p-md text-body-sm text-error">
              {error}
              <button
                type="button"
                onClick={clearError}
                className="ml-sm underline"
              >
                清除
              </button>
            </div>
          ) : null}

          {isLoading && repositories.length === 0 ? (
            <div className="flex flex-col gap-xs">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-12 rounded-lg border border-hairline bg-surface-1 animate-pulse"
                  style={{ animationDelay: `${i * 80}ms` }}
                  aria-hidden
                />
              ))}
            </div>
          ) : !isLoading && repositories.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-title">还没有仓库</span>
              <span className="empty-state-caption">
                创建一个仓库开始追踪提交节奏。每个仓库都会自动初始化 main 分支。
              </span>
              <AppButton onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4" /> 创建第一个仓库
              </AppButton>
            </div>
          ) : (
            <div className="flex flex-col gap-xs">
              {recentRepositories.map((repo) => (
                <RepositoryRow
                  key={repo.id}
                  repository={repo}
                  branchCount={repositoryCounts[repo.id]?.branchCount}
                  taskCount={repositoryCounts[repo.id]?.taskCount}
                  onDelete={() => deleteRepository(repo.id)}
                />
              ))}
              {repositories.length > recentRepositories.length ? (
                <p className="mt-2 text-center text-xs text-ink-subtle">
                  还有 {repositories.length - recentRepositories.length}{' '}
                  个仓库，更多请搜索或使用命令面板。
                </p>
              ) : null}
            </div>
          )}
        </section>

        <footer className="mt-4 border-t border-border-quiet pt-4 text-[11px] text-ink-subtle">
          最近更新 {repositories[0] ? formatRelativeTime(repositories[0].updatedAt) : '—'} ·
          数据保存在 IndexedDB ·
          按 {isMac ? '⌘K' : 'Ctrl+K'} 打开命令面板
        </footer>
      </div>

      <AppDialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <AppDialogContent>
          <AppDialogHeader>
            <AppDialogTitle>新建仓库</AppDialogTitle>
            <AppDialogDescription>
              输入仓库名称，系统会自动创建 main 分支。
            </AppDialogDescription>
          </AppDialogHeader>
          <AppInput
            placeholder="例如 web-app"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim() && !isLoading) {
                void handleCreate();
              }
            }}
          />
          <AppDialogFooter>
            <AppButton
              variant="secondary"
              onClick={() => setIsCreateOpen(false)}
            >
              取消
            </AppButton>
            <AppButton
              onClick={handleCreate}
              disabled={!newName.trim() || isLoading}
            >
              {isLoading ? '创建中…' : '创建'}
            </AppButton>
          </AppDialogFooter>
        </AppDialogContent>
      </AppDialog>
    </div>
  );
}

interface StatProps {
  label: string;
  value: number;
  icon: typeof Folder;
  tone?: 'default' | 'done' | 'warn';
  loading?: boolean;
}

function Stat({ label, value, icon: Icon, tone = 'default', loading }: StatProps): JSX.Element {
  return (
    <div
      className="stat-card"
      data-tone={tone === 'default' ? undefined : tone}
    >
      <div className="flex items-center justify-between">
        <span className="stat-card-label">{label}</span>
        <Icon
          className="h-3.5 w-3.5 text-ink-subtle"
          aria-hidden
        />
      </div>
      {loading ? (
        <div className="h-7 w-12 animate-pulse rounded bg-surface-strong" aria-hidden />
      ) : (
        <span className="stat-card-value tabular">{value}</span>
      )}
      <span className="stat-card-caption">实时统计</span>
    </div>
  );
}
