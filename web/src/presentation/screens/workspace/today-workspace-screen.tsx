import '@/core/theme/v3-tokens.css';

import * as React from 'react';
import { format } from 'date-fns';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Folder,
  Plus,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { V3AppShell } from '@/presentation/components/v3/v3-app-shell';
import { V3Button } from '@/presentation/components/v3/v3-button';
import { V3Card } from '@/presentation/components/v3/v3-card';
import { WebFileSaveService } from '@/platform/web-file-save-service';
import { container } from '@/core/di/injection-container';
import { Priority } from '@/domain/entities/enums';
import { cn } from '@/core/utils/formatters';
import { formatRelativeTime } from '@/core/utils/formatters';
import {
  getFilteredTasks,
  getProgress,
  getRecentRepositories,
  getTaskGroups,
  getWeekHeatmap,
  useTodayWorkspaceStore,
  type WorkspaceFilter,
} from '@/presentation/stores/today-workspace-store';

import { WorkspaceHeatmap } from './workspace-heatmap';
import { WorkspaceProgressRing } from './workspace-progress-ring';
import { WorkspaceRepoDialog } from './workspace-repo-dialog';
import { WorkspaceTaskDetail } from './workspace-task-detail';
import { WorkspaceTaskFormDrawer } from './workspace-task-form-drawer';
import { WorkspaceTaskGroup } from './workspace-task-group';

const filterTabs: { value: WorkspaceFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'today', label: '今天' },
  { value: 'overdue', label: '逾期' },
  { value: 'pendingCommit', label: '待提交' },
];

const priorityOptions = [
  { value: '', label: '按优先级' },
  { value: Priority.high, label: '高' },
  { value: Priority.medium, label: '中' },
  { value: Priority.low, label: '低' },
];

interface ToastState {
  open: boolean;
  message: string;
}

export function TodayWorkspaceScreen(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [toast, setToast] = React.useState<ToastState>({ open: false, message: '' });

  const {
    repositories,
    branches,
    tasks,
    commits,
    isLoading,
    error,
    filter,
    priorityFilter,
    showCompleted,
    selectedTaskId,
    isTaskFormOpen,
    isCreateRepoOpen,
    taskFormDefaults,
    load,
    setFilter,
    setPriorityFilter,
    toggleShowCompleted,
    openTaskForm,
    closeTaskForm,
    openCreateRepo,
    closeCreateRepo,
    selectTask,
    createTask,
    toggleCompleteTask,
    createRepository,
    exportDiagnostics,
  } = useTodayWorkspaceStore();

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (searchParams.get('create') === '1') {
      openCreateRepo();
      const next = new URLSearchParams(searchParams);
      next.delete('create');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, openCreateRepo]);

  const progress = React.useMemo(() => getProgress(tasks), [tasks]);
  const filteredTasks = React.useMemo(
    () => getFilteredTasks(tasks, filter, priorityFilter, showCompleted),
    [tasks, filter, priorityFilter, showCompleted]
  );
  const taskGroups = React.useMemo(
    () => getTaskGroups(filteredTasks, repositories, branches),
    [filteredTasks, repositories, branches]
  );
  const heatmapDays = React.useMemo(() => getWeekHeatmap(tasks), [tasks]);
  const recentRepositories = React.useMemo(
    () => getRecentRepositories(repositories, branches, tasks),
    [repositories, branches, tasks]
  );

  const selectedTask = React.useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );
  const selectedTaskBranch = React.useMemo(
    () => branches.find((b) => b.id === selectedTask?.branchId) ?? null,
    [branches, selectedTask]
  );
  const selectedTaskRepo = React.useMemo(
    () =>
      repositories.find(
        (r) => r.id === selectedTaskBranch?.repositoryId
      ) ?? null,
    [repositories, selectedTaskBranch]
  );

  const handleTaskFormSubmit = React.useCallback(
    async (data: {
      branchId: string;
      title: string;
      description: string;
      priority: Priority;
      dueDate: Date | null;
    }) => {
      const created = await createTask(data);
      if (created) {
        setToast({ open: true, message: `任务已添加到 ${selectedTaskRepo?.name ?? '仓库'}` });
        window.setTimeout(() => setToast((t) => ({ ...t, open: false })), 3000);
      }
    },
    [createTask, selectedTaskRepo]
  );

  const handleToggleComplete = React.useCallback(
    async (taskId: string) => {
      await toggleCompleteTask(taskId);
      const task = useTodayWorkspaceStore
        .getState()
        .tasks.find((t) => t.id === taskId);
      if (task) {
        setToast({
          open: true,
          message: task.isCompleted ? '任务已标记为已完成' : '任务已恢复为待办',
        });
        window.setTimeout(() => setToast((t) => ({ ...t, open: false })), 3000);
      }
    },
    [toggleCompleteTask]
  );

  const handleCreateRepository = React.useCallback(
    async (data: {
      name: string;
      description: string;
      defaultBranch: string;
      color: string;
    }) => {
      const created = await createRepository(data);
      if (created) {
        navigate(`/repository/${created.id}`);
      }
    },
    [createRepository, navigate]
  );

  const handleExportDiagnostics = React.useCallback(async () => {
    try {
      const json = await exportDiagnostics();
      const fileSaveService = container.resolve(WebFileSaveService);
      fileSaveService.save({
        content: json,
        filename: `commit-diagnostics-${format(new Date(), 'yyyyMMdd-HHmmss')}.json`,
        mimeType: 'application/json',
      });
    } catch {
      setToast({ open: true, message: '导出诊断信息失败' });
      window.setTimeout(() => setToast((t) => ({ ...t, open: false })), 3000);
    }
  }, [exportDiagnostics]);

  const completedCount = React.useMemo(
    () => filteredTasks.filter((t) => t.isCompleted).length,
    [filteredTasks]
  );

  const dateLabel = format(new Date(), 'yyyy 年 M 月 d 日');
  const progressRatio = progress.total > 0 ? progress.done / progress.total : 0;
  const longestStreak = React.useMemo(() => {
    let streak = 0;
    let maxStreak = 0;
    for (const day of heatmapDays) {
      if (day.count > 0) {
        streak += 1;
        maxStreak = Math.max(maxStreak, streak);
      } else {
        streak = 0;
      }
    }
    return maxStreak;
  }, [heatmapDays]);

  return (
    <V3AppShell recentRepositories={repositories}>
      <div className="flex min-h-[calc(100vh-var(--v3-app-chrome))]">
        {/* Main task area */}
        <div className="flex min-w-0 flex-1 flex-col border-r border-[var(--v3-border-soft)]">
          <div className="px-8 py-7">
            {/* Title area */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.08em]">
                  <span className="text-[var(--v3-primary)]">TODAY</span>
                  <span className="text-[var(--v3-text-muted)]"> · {dateLabel}</span>
                </p>
                <h1 className="mt-1 text-[52px] font-bold leading-[1.05] text-[var(--v3-text-strong)]">
                  今天
                </h1>
                <p className="mt-2 text-[16px] text-[var(--v3-text-secondary)]">
                  先完成最重要的事，再把进展提交掉。
                </p>
              </div>
              <div className="flex items-center gap-3">
                <V3Button onClick={openTaskForm}>
                  <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
                  快速添加任务
                </V3Button>
                <V3Button variant="secondary" onClick={openCreateRepo}>
                  <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
                  新建仓库
                </V3Button>
              </div>
            </div>

            <div className="mt-6 h-px bg-[var(--v3-divider)]" aria-hidden="true" />

            {isLoading ? (
              <div className="mt-12 flex items-center justify-center gap-2 text-[var(--v3-text-muted)]">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--v3-border)] border-t-[var(--v3-primary)]" />
                加载中…
              </div>
            ) : error ? (
              <div className="mt-8 rounded-[var(--v3-radius-lg)] border border-[var(--v3-danger)] bg-[var(--v3-danger-soft)] p-6">
                <h2 className="text-[18px] font-semibold text-[var(--v3-text-strong)]">
                  无法加载今日任务
                </h2>
                <p className="mt-1 text-[14px] text-[var(--v3-text-secondary)]">
                  {error}
                </p>
                <div className="mt-4 flex gap-3">
                  <V3Button onClick={() => void load()}>重试</V3Button>
                  <V3Button variant="secondary" onClick={() => void handleExportDiagnostics()}>
                    导出诊断信息
                  </V3Button>
                </div>
              </div>
            ) : repositories.length === 0 ? (
              <div className="mt-16 flex flex-col items-center gap-4 text-center">
                <h2 className="text-[32px] font-bold text-[var(--v3-text-strong)]">今天</h2>
                <p className="max-w-[420px] text-[16px] text-[var(--v3-text-secondary)]">
                  先创建第一个仓库，把长期目标收进一个清晰边界。
                </p>
                <V3Button onClick={openCreateRepo}>新建仓库</V3Button>
              </div>
            ) : (
              <>
                {/* Focus area */}
                <div className="mt-6 flex flex-col gap-4 laptop:flex-row laptop:items-center laptop:justify-between">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[18px] font-semibold text-[var(--v3-text-strong)]">
                        今日焦点
                      </span>
                      <span className="text-[13px] text-[var(--v3-text-muted)]">
                        {progress.done} / {progress.total} 已完成
                      </span>
                    </div>
                    <div className="h-[4px] w-full max-w-[297px] overflow-hidden rounded-full bg-[var(--v3-border-soft)]">
                      <div
                        className="h-full rounded-full bg-[var(--v3-primary)] transition-all duration-(--v3-standard)"
                        style={{ width: `${progressRatio * 100}%` }}
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] p-1">
                      {filterTabs.map((tab) => (
                        <button
                          key={tab.value}
                          type="button"
                          onClick={() => setFilter(tab.value)}
                          className={cn(
                            'relative h-[30px] px-3 text-[13px] font-medium transition-colors',
                            filter === tab.value
                              ? 'text-[var(--v3-text-strong)]'
                              : 'text-[var(--v3-text-muted)] hover:text-[var(--v3-text)]'
                          )}
                        >
                          {tab.label}
                          {filter === tab.value ? (
                            <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-[var(--v3-primary)]" />
                          ) : null}
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <select
                        value={priorityFilter ?? ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setPriorityFilter(
                            value === '' ? null : (Number(value) as Priority)
                          );
                        }}
                        className="h-[38px] w-[132px] appearance-none rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] pl-3 pr-8 text-[13px] text-[var(--v3-text)] outline-none focus-visible:border-[var(--v3-primary)]"
                      >
                        {priorityOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={14}
                        strokeWidth={1.5}
                        aria-hidden="true"
                        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--v3-text-muted)]"
                      />
                    </div>
                  </div>
                </div>

                {/* Task list */}
                <div className="mt-6 flex flex-col gap-6" role="list">
                  {taskGroups.length === 0 ? (
                    <div className="rounded-[var(--v3-radius-lg)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] p-8 text-center">
                      <p className="text-[16px] font-medium text-[var(--v3-text-strong)]">
                        今天没有截止任务
                      </p>
                      <p className="mt-1 text-[14px] text-[var(--v3-text-secondary)]">
                        可以从最近仓库添加一个任务，或者进入仓库继续推进。
                      </p>
                      <div className="mt-4 flex justify-center gap-3">
                        <V3Button onClick={openTaskForm}>快速添加任务</V3Button>
                        {repositories[0] ? (
                          <V3Button variant="secondary" asChild>
                            <Link to={`/repository/${repositories[0].id}`}>进入最近仓库</Link>
                          </V3Button>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    taskGroups.map((group) => (
                      <WorkspaceTaskGroup
                        key={`${group.repository.id}:${group.branch.id}`}
                        group={group}
                        onTaskClick={(task) => void selectTask(task.id)}
                        onToggleComplete={(task) => void handleToggleComplete(task.id)}
                      />
                    ))
                  )}
                </div>

                {completedCount > 0 ? (
                  <button
                    type="button"
                    onClick={toggleShowCompleted}
                    className="mx-auto mt-6 flex items-center gap-1 text-[13px] text-[var(--v3-text-muted)] transition-colors hover:text-[var(--v3-text-strong)]"
                  >
                    {showCompleted ? (
                      <>-<span>收起已完成的任务</span></>
                    ) : (
                      <>+<span>显示已完成的任务</span></>
                    )}
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>

        {/* Right info column */}
        <aside className="hidden w-[388px] flex-col gap-5 border-l border-[var(--v3-border-soft)] bg-[var(--v3-bg-near)] p-5 desktop:flex">
          {/* Today rhythm */}
          <V3Card className="flex flex-col gap-4 p-5">
            <h2 className="text-[16px] font-semibold text-[var(--v3-text-strong)]">
              今日节奏
            </h2>
            <div className="flex items-center gap-5">
              <WorkspaceProgressRing
                progress={progressRatio}
                aria-label={`今日完成 ${progress.done} 个，共 ${progress.total} 个，完成率 ${Math.round(progressRatio * 100)}%`}
              >
                <div className="flex flex-col items-center">
                  <span className="text-[22px] font-semibold text-[var(--v3-text-strong)]">
                    {progress.done} / {progress.total}
                  </span>
                  <span className="text-[12px] text-[var(--v3-text-muted)]">完成率</span>
                </div>
              </WorkspaceProgressRing>
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex justify-between text-[13px]">
                  <span className="text-[var(--v3-text-secondary)]">待处理任务</span>
                  <span className="font-medium text-[var(--v3-text-strong)]">
                    {progress.total - progress.done}
                  </span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-[var(--v3-text-secondary)]">已完成任务</span>
                  <span className="font-medium text-[var(--v3-primary)]">{progress.done}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-[var(--v3-text-secondary)]">逾期任务</span>
                  <span className="font-medium text-[var(--v3-danger)]">{progress.overdue}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-[var(--v3-text-secondary)]">预计用时</span>
                  <span className="font-medium text-[var(--v3-text-strong)]">
                    {Math.floor(progress.estimateMinutes / 60)}h{' '}
                    {progress.estimateMinutes % 60}m
                  </span>
                </div>
              </div>
            </div>
          </V3Card>

          {/* Week heatmap */}
          <V3Card aria-label="本周热力图" className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-[var(--v3-text-strong)]">
                本周热力图
              </h2>
              <span className="text-[12px] text-[var(--v3-text-muted)]">
                连续完成 {longestStreak} 天
              </span>
            </div>
            <WorkspaceHeatmap tasks={tasks} />
            <Link
              to="/insights?tab=heatmap"
              className="group mt-1 flex items-center gap-1 text-[13px] text-[var(--v3-text-secondary)] transition-colors hover:text-[var(--v3-primary)]"
            >
              查看完整洞察
              <ArrowRight
                size={14}
                strokeWidth={1.5}
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </V3Card>

          {/* Recent repositories */}
          {recentRepositories.length > 0 ? (
            <V3Card aria-label="最近仓库" className="flex flex-col gap-4 p-5">
              <h2 className="text-[16px] font-semibold text-[var(--v3-text-strong)]">
                最近仓库
              </h2>
              <ul className="flex flex-col gap-2">
                {recentRepositories.map((item) => (
                  <li key={item.repository.id}>
                    <Link
                      to={`/repository/${item.repository.id}`}
                      className="flex h-[58px] items-center gap-3 rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-3 transition-colors hover:border-[var(--v3-border)] hover:bg-[var(--v3-control)]"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.repository.color }}
                        aria-hidden="true"
                      />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[15px] font-semibold text-[var(--v3-text-strong)]">
                          {item.repository.name}
                        </span>
                        <span className="truncate text-[12px] text-[var(--v3-text-muted)]">
                          {item.mainBranch?.name ?? 'main'} · 最后活动{' '}
                          {formatRelativeTime(item.lastActivityAt)}
                        </span>
                      </div>
                      <span className="text-[13px] font-medium text-[var(--v3-primary)]">
                        {item.taskCount} 任务
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                to="/search"
                className="group mt-1 flex items-center gap-1 text-[13px] text-[var(--v3-text-secondary)] transition-colors hover:text-[var(--v3-primary)]"
              >
                查看全部仓库
                <ArrowRight
                  size={14}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </V3Card>
          ) : (
            <V3Card className="flex flex-col gap-3 p-5">
              <div className="flex items-center gap-2 text-[var(--v3-text-strong)]">
                <Folder size={18} strokeWidth={1.5} aria-hidden="true" />
                <span className="text-[16px] font-semibold">本地优先</span>
              </div>
              <p className="text-[13px] leading-[1.6] text-[var(--v3-text-secondary)]">
                所有数据保存在本机 IndexedDB，离线也可继续工作。创建第一个仓库后，这里会显示最近仓库。
              </p>
            </V3Card>
          )}
        </aside>
      </div>

      <WorkspaceTaskFormDrawer
        open={isTaskFormOpen}
        onOpenChange={closeTaskForm}
        defaultRepositoryId={taskFormDefaults?.repositoryId ?? null}
        defaultBranchId={taskFormDefaults?.branchId ?? null}
        repositories={repositories}
        branches={branches}
        onSubmit={(data) => void handleTaskFormSubmit(data)}
        isLoading={isLoading}
      />

      <WorkspaceRepoDialog
        open={isCreateRepoOpen}
        onOpenChange={closeCreateRepo}
        onSubmit={(data) => void handleCreateRepository(data)}
        isLoading={isLoading}
      />

      <WorkspaceTaskDetail
        open={selectedTaskId !== null}
        onOpenChange={(open) => {
          if (!open) void selectTask(null);
        }}
        task={selectedTask}
        repository={selectedTaskRepo}
        branch={selectedTaskBranch}
        commits={commits}
        onComplete={() => {
          if (selectedTaskId) void handleToggleComplete(selectedTaskId);
        }}
      />

      {/* Toast */}
      <div
        className={cn(
          'pointer-events-auto fixed bottom-14 right-4 z-[100] flex max-w-sm items-center gap-2 rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-card)] px-4 py-3 shadow-[var(--v3-shadow-panel)] transition-[opacity,transform] duration-(--v3-standard)',
          toast.open
            ? 'translate-y-0 opacity-100'
            : 'translate-y-2 opacity-0 pointer-events-none'
        )}
        aria-live="polite"
      >
        <CheckCircle2
          size={16}
          strokeWidth={1.5}
          className="text-[var(--v3-primary)]"
          aria-hidden="true"
        />
        <span className="text-[14px] text-[var(--v3-text)]">{toast.message}</span>
      </div>
    </V3AppShell>
  );
}
