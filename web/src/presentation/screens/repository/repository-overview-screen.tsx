import '@/core/theme/v3-tokens.css';

import * as React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus } from 'lucide-react';

import { Task } from '@/domain/entities/task';
import { formatRelativeTime } from '@/core/utils/formatters';
import { V3AppShell, V3Button, V3Card, V3LoadingState, V3Section } from '@/presentation/components/v3';
import { useRepositoryOverviewStore } from '@/presentation/stores/repository-overview-store';
import { BranchSummaryCard } from './branch-summary-card';
import { ProgressGroup } from './progress-group';
import { CommitTimelineCard } from './commit-timeline-card';
import { HeatmapMiniCard } from './heatmap-mini-card';
import { NewBranchDialog } from './new-branch-dialog';
import { NewTaskPanel } from './new-task-panel';
import { TaskDetailSlideout } from './task-detail-slideout';
import { buildBranchSummaries } from './repository-overview-helpers';

export function RepositoryOverviewScreen(): JSX.Element {
  const { id: repositoryId } = useParams<{ id: string }>();
  const {
    repository,
    branches,
    activeBranchId,
    allTasks,
    commits,
    isLoading,
    load,
    switchBranch,
    createBranch,
    createTask,
    completeTask,
  } = useRepositoryOverviewStore();

  const [isBranchDialogOpen, setIsBranchDialogOpen] = React.useState(false);
  const [isTaskPanelOpen, setIsTaskPanelOpen] = React.useState(false);
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (repositoryId) {
      void load(repositoryId);
    }
  }, [repositoryId, load]);

  const branchSummaries = React.useMemo(
    () => buildBranchSummaries(branches, allTasks, commits),
    [branches, allTasks, commits]
  );

  const selectedTask = React.useMemo(
    () => allTasks.find((t) => t.id === selectedTaskId) ?? null,
    [allTasks, selectedTaskId]
  );

  const selectedTaskBranch = React.useMemo(
    () => branches.find((b) => b.id === selectedTask?.branchId) ?? null,
    [branches, selectedTask]
  );

  const progressGroups = React.useMemo(() => {
    return branches.map((branch) => ({
      branch,
      tasks: allTasks
        .filter((t) => t.branchId === branch.id)
        .slice(0, 3),
      totalCount: allTasks.filter((t) => t.branchId === branch.id).length,
    }));
  }, [branches, allTasks]);

  const handleCreateBranch = async (data: {
    name: string;
    parentBranchId: string | null;
    color: string;
    description: string;
  }): Promise<void> => {
    const branch = await createBranch(data.name, {
      parentBranchId: data.parentBranchId,
      color: data.color,
    });
    if (branch) setIsBranchDialogOpen(false);
  };

  const handleCreateTask = async (data: {
    branchId: string;
    title: string;
    description: string;
    status: import('@/domain/entities/enums').TaskStatus;
    priority: import('@/domain/entities/enums').Priority;
    dueDate: Date | null;
  }): Promise<void> => {
    const task = await createTask(data.branchId, {
      title: data.title,
      description: data.description || null,
      priority: data.priority,
      dueDate: data.dueDate,
    });
    if (task) setIsTaskPanelOpen(false);
  };

  const handleTaskClick = (task: Task): void => {
    setSelectedTaskId(task.id);
  };

  const handleToggleComplete = (task: Task): void => {
    void completeTask(task.id);
  };

  const lastActivity = React.useMemo(() => {
    const candidates = [
      repository?.updatedAt,
      ...allTasks.map((t) => t.updatedAt),
      ...commits.map((c) => c.createdAt),
    ].filter((d): d is Date => d !== undefined);
    if (candidates.length === 0) return null;
    return candidates.sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  }, [repository, allTasks, commits]);

  if (isLoading || !repository) {
    return (
      <V3AppShell currentRepositoryId={repositoryId}>
        <div className="flex min-h-[calc(100vh-var(--v3-top-bar-height)-var(--v3-status-bar-height))] items-center justify-center">
          <V3LoadingState />
        </div>
      </V3AppShell>
    );
  }

  return (
    <V3AppShell currentRepositoryId={repositoryId}>
      <V3Section
        contained={false}
        padded={false}
        className="min-h-[calc(100vh-var(--v3-app-chrome))] px-6 py-6 desktop:px-8"
      >
        <div className="mx-auto grid grid-cols-1 gap-6 desktop:grid-cols-[284px_1fr_399px]">
          {/* Main column */}
          <div className="col-span-1 desktop:col-span-2">
            {/* Title area */}
            <header className="mb-6 flex flex-col gap-1 laptop:flex-row laptop:items-end laptop:justify-between">
              <div>
                <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-[var(--v3-primary)]">
                  LOCAL REPOSITORY
                </span>
                <h1 className="mt-1 text-[40px] font-bold leading-tight text-[var(--v3-text-strong)] desktop:text-[54px]">
                  {repository.name}
                </h1>
                <p className="mt-1 text-[17px] text-[var(--v3-text-secondary)]">
                  {repository.description || '这个仓库还没有描述。'}
                </p>
                {lastActivity ? (
                  <div className="mt-2 flex items-center gap-2 text-[13px] text-[var(--v3-text-muted)]">
                    <span
                      className="h-2 w-2 rounded-full bg-[var(--v3-primary)]"
                      aria-hidden="true"
                    />
                    最近活动 · {formatRelativeTime(lastActivity)}
                  </div>
                ) : null}
              </div>
              <div className="mt-4 flex gap-3 laptop:mt-0">
                <V3Button
                  variant="secondary"
                  className="gap-1.5"
                  onClick={() => setIsBranchDialogOpen(true)}
                >
                  <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
                  新建分支
                </V3Button>
                <V3Button
                  className="gap-1.5"
                  onClick={() => setIsTaskPanelOpen(true)}
                >
                  <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
                  新建任务
                </V3Button>
              </div>
            </header>

            {/* Branch summary + Progress */}
            <div className="grid grid-cols-1 gap-5 laptop:grid-cols-[284px_1fr]">
              {/* Branch summary panel */}
              <V3Card className="flex h-fit flex-col gap-4 p-[18px]">
                <h2 className="text-[20px] font-semibold text-[var(--v3-text-strong)]">
                  分支概况
                </h2>

                {branches.length === 0 ? (
                  <div className="py-6 text-center">
                    <span className="block text-[14px] text-[var(--v3-text-secondary)]">
                      还没有分支
                    </span>
                    <span className="mt-1 block text-[12px] text-[var(--v3-text-muted)]">
                      创建 main 分支后开始拆分任务。
                    </span>
                    <V3Button
                      className="mt-4"
                      onClick={() => setIsBranchDialogOpen(true)}
                    >
                      新建分支
                    </V3Button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-3">
                      {branchSummaries.map((summary) => (
                        <BranchSummaryCard
                          key={summary.branch.id}
                          branch={summary.branch}
                          totalCount={summary.totalCount}
                          inProgressCount={summary.inProgressCount}
                          lastActivity={summary.lastActivity}
                          isActive={summary.branch.id === activeBranchId}
                          onClick={() => switchBranch(summary.branch.id)}
                        />
                      ))}
                    </div>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setIsBranchDialogOpen(true)}
                        className="inline-flex items-center gap-1 text-[13px] text-[var(--v3-text-secondary)] transition-colors hover:text-[var(--v3-primary)]"
                      >
                        查看全部分支
                        <span aria-hidden="true">{'>'}</span>
                      </button>
                    </div>
                  </>
                )}
              </V3Card>

              {/* Progress panel */}
              <V3Card className="flex h-fit min-h-[400px] flex-col gap-5 p-[18px]">
                <div className="flex items-center justify-between">
                  <h2 className="text-[20px] font-semibold text-[var(--v3-text-strong)]">
                    当前推进
                  </h2>
                </div>

                {progressGroups.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
                    <span className="text-[14px] text-[var(--v3-text-secondary)]">
                      还没有任务
                    </span>
                    <span className="mt-1 text-[12px] text-[var(--v3-text-muted)]">
                      从右上角「新建任务」开始。
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-6">
                      {progressGroups.map((group) => (
                        <ProgressGroup
                          key={group.branch.id}
                          branch={group.branch}
                          tasks={group.tasks}
                          totalCount={group.totalCount}
                          onTaskClick={handleTaskClick}
                          onToggleComplete={handleToggleComplete}
                        />
                      ))}
                    </div>
                    <div className="pt-2">
                      <Link
                        to={`/repository/${repositoryId}/tasks${
                          activeBranchId ? `?branch=${activeBranchId}` : ''
                        }`}
                        className="inline-flex items-center gap-1 text-[13px] text-[var(--v3-text-secondary)] transition-colors hover:text-[var(--v3-primary)]"
                      >
                        查看全部任务
                        <span aria-hidden="true">{'>'}</span>
                      </Link>
                    </div>
                  </>
                )}
              </V3Card>
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-5">
            <div className="h-[374px]">
              <CommitTimelineCard
                repositoryId={repository.id}
                commits={commits}
                branches={branches}
              />
            </div>
            <div className="h-[428px]">
              <HeatmapMiniCard
                repositoryId={repository.id}
                tasks={allTasks}
                commits={commits}
              />
            </div>
          </div>
        </div>
      </V3Section>

      <NewBranchDialog
        isOpen={isBranchDialogOpen}
        onClose={() => setIsBranchDialogOpen(false)}
        onSubmit={handleCreateBranch}
        branches={branches}
        defaultParentBranchId={activeBranchId}
      />

      <NewTaskPanel
        isOpen={isTaskPanelOpen}
        onClose={() => setIsTaskPanelOpen(false)}
        onSubmit={handleCreateTask}
        branches={branches}
        defaultBranchId={activeBranchId ?? branches[0]?.id ?? ''}
        repositoryName={repository.name}
      />

      <TaskDetailSlideout
        task={selectedTask}
        branch={selectedTaskBranch}
        repository={repository}
        isOpen={selectedTaskId !== null}
        onClose={() => setSelectedTaskId(null)}
        onComplete={() => {
          if (selectedTask) void completeTask(selectedTask.id);
        }}
        onDelete={() => setSelectedTaskId(null)}
      />
    </V3AppShell>
  );
}
