import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Loader2, Plus, Folder, Filter as FilterIcon } from 'lucide-react';

import { useRepositoryStore } from '../stores/repository-store';
import { useTaskStore } from '../stores/task-store';
import { Priority, TaskStatus } from '../../domain/entities/enums';
import { Task } from '../../domain/entities/task';
import { Branch } from '../../domain/entities/branch';

import { AppButton } from '../components/common/app-button';
import { AppInput } from '../components/common/app-input';
import {
  AppDialog,
  AppDialogContent,
  AppDialogDescription,
  AppDialogFooter,
  AppDialogHeader,
  AppDialogTitle,
} from '../components/common/app-dialog';

import {
  BranchTreePanel,
  type TaskFilterView,
} from '../components/tasks/branch-tree-panel';
import { TaskList } from '../components/tasks/task-list';
import { TaskDetailDrawer } from '../components/tasks/task-detail-drawer';
import { formatRelativeTime } from '../../core/utils/formatters';

export function RepositoryScreen(): JSX.Element {
  const { id: repoId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    repository,
    branches,
    tasks,
    activeBranchId,
    isLoading,
    error,
    loadData,
    switchBranch,
    createBranch,
    mergeBranch,
    deleteBranch,
    completeTask,
    clearError,
    selectedTaskId,
    selectTask,
  } = useRepositoryStore();

  const {
    task: drawerTask,
    commits: drawerCommits,
    isLoading: drawerLoading,
    load: loadDrawerTask,
    completeTask: completeDetailTask,
    deleteTask: deleteDetailTask,
  } = useTaskStore();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filterView, setFilterView] = useState<TaskFilterView>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all');
  const [createBranchOpen, setCreateBranchOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');

  // Load repository context
  useEffect(() => {
    if (repoId) void loadData(repoId);
  }, [repoId, loadData]);

  // Honor deep links: ?branch=:id and ?task=:id
  useEffect(() => {
    if (!branches.length) return;
    const branchParam = searchParams.get('branch');
    if (branchParam && branches.some((b) => b.id === branchParam)) {
      switchBranch(branchParam);
    }
    const taskParam = searchParams.get('task');
    if (taskParam) {
      selectTask(taskParam);
      setDrawerOpen(true);
      void loadDrawerTask(taskParam);
    }
  }, [branches, searchParams, switchBranch, selectTask, loadDrawerTask]);

  const openTaskDrawer = (taskId: string): void => {
    selectTask(taskId);
    setDrawerOpen(true);
    void loadDrawerTask(taskId);
  };

  const closeTaskDrawer = (): void => {
    setDrawerOpen(false);
    selectTask(null);
    const next = new URLSearchParams(searchParams);
    if (next.has('task')) {
      next.delete('task');
      setSearchParams(next, { replace: true });
    }
  };

  const activeBranch: Branch | null = useMemo(
    () => branches.find((b) => b.id === activeBranchId) ?? null,
    [branches, activeBranchId]
  );

  const visibleTasks = useMemo<Task[]>(() => {
    return tasks.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (filterView === 'today') {
        if (!t.dueDate) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(t.dueDate);
        due.setHours(0, 0, 0, 0);
        if (due.getTime() !== today.getTime()) return false;
      }
      if (filterView === 'pending-commit') {
        if (t.status === TaskStatus.done || t.status === TaskStatus.cancelled) {
          return false;
        }
      }
      if (filterView === 'completed') {
        if (t.status !== TaskStatus.done) return false;
      }
      return true;
    });
  }, [tasks, statusFilter, priorityFilter, filterView]);

  const handleSelectBranch = (branch: Branch): void => {
    switchBranch(branch.id);
  };

  const handleCreateBranch = async (): Promise<void> => {
    if (!newBranchName.trim() || !activeBranch) return;
    const created = await createBranch(newBranchName.trim(), {
      parentBranchId: activeBranch.id,
      color: activeBranch.color,
    });
    if (created) {
      setNewBranchName('');
      setCreateBranchOpen(false);
    }
  };

  const handleMerge = async (branch: Branch): Promise<void> => {
    const main = branches.find((b) => b.isMain);
    if (!main) return;
    await mergeBranch(branch.id, main.id);
  };

  const handleDeleteBranch = async (branch: Branch): Promise<void> => {
    await deleteBranch(branch.id);
  };

  if (!isLoading && !repository) {
    return (
      <div className="work-main-pad">
        <div className="empty-state">
          <span className="empty-state-title">仓库不存在</span>
          <span className="empty-state-caption">
            这个仓库可能已被删除或链接已失效。回到工作台选择其他仓库。
          </span>
          <AppButton onClick={() => navigate('/workspace')}>回到工作台</AppButton>
        </div>
      </div>
    );
  }

  return (
    <div className="work-surface flex-1" data-drawer={drawerOpen ? 'open' : 'closed'}>
      <BranchTreePanel
        branches={branches}
        activeBranchId={activeBranchId}
        tasks={tasks.map((t) => ({ status: t.status, branchId: t.branchId }))}
        onSelectBranch={handleSelectBranch}
        onCreateBranch={() => setCreateBranchOpen(true)}
        onMergeBranch={handleMerge}
        onDeleteBranch={handleDeleteBranch}
        view={filterView}
        onChangeView={setFilterView}
      />

      <section className="work-main">
        <header className="page-container flex flex-wrap items-end justify-between gap-md border-b border-border-quiet px-md py-md">
          <div className="flex flex-col gap-xs">
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-subtle">
              当前分支
            </span>
            <div className="flex items-center gap-sm">
              <Folder className="h-5 w-5 text-primary" aria-hidden />
              <h1 className="text-[18px] font-semibold text-ink">
                {repository?.name ?? '仓库'}
              </h1>
              {activeBranch ? (
                <>
                  <span className="text-ink-subtle">/</span>
                  <span className="font-mono text-[12px] text-primary">
                    {activeBranch.name}
                  </span>
                  <span className="font-mono text-[11px] text-ink-subtle">
                    {tasks.length} 任务
                  </span>
                </>
              ) : null}
            </div>
            {repository ? (
              <span className="font-mono text-[11px] text-ink-subtle">
                最近活动 · {formatRelativeTime(repository.updatedAt)}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-xs">
            <AppButton
              variant="secondary"
              size="sm"
              onClick={() => setCreateBranchOpen(true)}
              disabled={!activeBranch}
            >
              <Plus className="h-3.5 w-3.5" /> 新建分支
            </AppButton>
            <AppButton
              size="sm"
              onClick={() =>
                repoId &&
                activeBranchId &&
                navigate(
                  `/repository/${repoId}/task/new?branchId=${activeBranchId}`
                )
              }
              disabled={!activeBranchId}
            >
              <Plus className="h-3.5 w-3.5" /> 新建任务
            </AppButton>
          </div>
        </header>

        {error ? (
          <div className="mx-md mt-md flex items-center justify-between rounded-md border border-error bg-error-soft px-md py-sm text-body-sm text-error">
            <span>{error}</span>
            <button
              type="button"
              onClick={clearError}
              className="underline"
            >
              清除
            </button>
          </div>
        ) : null}

        <div className="work-main-pad page-container">
          <div className="flex flex-wrap items-center gap-sm">
            <FilterChip
              label="全部"
              active={statusFilter === 'all'}
              onClick={() => setStatusFilter('all')}
            />
            <FilterChip
              label="待办"
              active={statusFilter === TaskStatus.todo}
              onClick={() => setStatusFilter(TaskStatus.todo)}
            />
            <FilterChip
              label="进行中"
              active={statusFilter === TaskStatus.inProgress}
              onClick={() => setStatusFilter(TaskStatus.inProgress)}
            />
            <FilterChip
              label="已完成"
              active={statusFilter === TaskStatus.done}
              onClick={() => setStatusFilter(TaskStatus.done)}
            />
            <span className="mx-1 h-3 w-px bg-border" aria-hidden />
            <FilterChip
              label="低"
              active={priorityFilter === Priority.low}
              onClick={() =>
                setPriorityFilter(
                  priorityFilter === Priority.low ? 'all' : Priority.low
                )
              }
            />
            <FilterChip
              label="中"
              active={priorityFilter === Priority.medium}
              onClick={() =>
                setPriorityFilter(
                  priorityFilter === Priority.medium ? 'all' : Priority.medium
                )
              }
            />
            <FilterChip
              label="高"
              active={priorityFilter === Priority.high}
              onClick={() =>
                setPriorityFilter(
                  priorityFilter === Priority.high ? 'all' : Priority.high
                )
              }
            />
            <span className="ml-auto inline-flex items-center gap-1 font-mono text-[11px] text-ink-subtle">
              <FilterIcon className="h-3 w-3" aria-hidden /> 共{' '}
              {visibleTasks.length} 条
            </span>
          </div>

          {isLoading && tasks.length === 0 ? (
            <div className="empty-state">
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
              <span className="empty-state-title">正在加载任务…</span>
            </div>
          ) : (
            <TaskList
              tasks={visibleTasks}
              selectedTaskId={selectedTaskId}
              branchName={activeBranch?.name ?? null}
              onItemClick={(task) => {
                openTaskDrawer(task.id);
              }}
              onToggleComplete={(task) => void completeTask(task.id)}
            />
          )}
        </div>
      </section>

      <TaskDetailDrawer
        open={drawerOpen}
        onOpenChange={(o) => {
          if (o) setDrawerOpen(true);
          else closeTaskDrawer();
        }}
        task={drawerTask}
        commits={drawerCommits}
        isLoading={drawerLoading}
        branchName={activeBranch?.name ?? null}
        repositoryName={repository?.name ?? null}
        onComplete={async () => {
          await completeDetailTask();
          if (repoId) await loadData(repoId);
        }}
        onDelete={async () => {
          await deleteDetailTask();
          if (repoId) await loadData(repoId);
          closeTaskDrawer();
        }}
        onEdit={() => {
          if (drawerTask && repoId) {
            setDrawerOpen(false);
            navigate(
              `/repository/${repoId}/task/${drawerTask.id}/edit?branchId=${drawerTask.branchId}`
            );
          }
        }}
      />

      <AppDialog open={createBranchOpen} onOpenChange={setCreateBranchOpen}>
        <AppDialogContent>
          <AppDialogHeader>
            <AppDialogTitle>新建分支</AppDialogTitle>
            <AppDialogDescription>
              从当前分支 {activeBranch?.name ?? 'main'} 派生出新分支。
            </AppDialogDescription>
          </AppDialogHeader>
          <AppInput
            placeholder="分支名称"
            value={newBranchName}
            onChange={(e) => setNewBranchName(e.target.value)}
            autoFocus
          />
          <AppDialogFooter>
            <AppButton
              variant="secondary"
              onClick={() => setCreateBranchOpen(false)}
            >
              取消
            </AppButton>
            <AppButton
              onClick={() => void handleCreateBranch()}
              disabled={!newBranchName.trim() || isLoading}
            >
              创建
            </AppButton>
          </AppDialogFooter>
        </AppDialogContent>
      </AppDialog>
    </div>
  );
}

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function FilterChip({ label, active, onClick }: FilterChipProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`filter-pill inline-flex w-auto px-3 py-1 text-[12px]${
        active ? ' text-primary' : ''
      }`}
      data-active={active}
    >
      {label}
    </button>
  );
}
