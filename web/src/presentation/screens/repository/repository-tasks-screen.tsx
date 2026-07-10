import '@/core/theme/v3-tokens.css';

import * as React from 'react';
import { useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';

import { CommitType, Priority, TaskStatus } from '@/domain/entities/enums';
import { Task } from '@/domain/entities/task';
import { V3AppShell, V3Button, V3Card } from '@/presentation/components/v3';
import { useRepositoryStore } from '@/presentation/stores/repository-store';
import { useTaskStore } from '@/presentation/stores/task-store';

import { BranchManagementMenu } from './branch-management-menu';
import { BranchTabs } from './branch-tabs';
import { CompleteCommitPanel } from './complete-commit-panel';
import { ConfirmDialog } from './confirm-dialog';
import { FilterSidebar } from './filter-sidebar';
import { TaskDetailPanel } from './task-detail-panel';
import { TaskFormData, TaskFormPanel } from './task-form-panel';
import { TaskTable } from './task-table';
import {
  DueDateFilterKey,
  StatusCounts,
  StatusFilterKey,
  TaskSortKey,
} from './repository-tasks-types';
import {
  getBranchTaskCounts,
  getStatusCounts,
  matchesDueDateFilter,
  matchesSearch,
  matchesStatusFilter,
  sortTasks,
} from './repository-tasks-filter';

const DEFAULT_SELECTED_TITLE = '完成晨跑 5 km';

export function RepositoryTasksScreen(): JSX.Element {
  const { id: repositoryId } = useParams<{ id: string }>();

  const {
    repository,
    branches,
    tasks,
    allRepositoryTasks,
    activeBranchId,
    selectedTaskId,
    isLoading,
    error,
    loadData,
    switchBranch,
    selectTask,
    createTask,
    updateTask,
    completeAndCommit,
    restoreTask,
    deleteTask,
    createBranch,
    renameBranch,
    mergeBranch,
    deleteBranch,
    clearError,
  } = useRepositoryStore();

  const {
    task: detailTask,
    commits: detailCommits,
    load: loadDetail,
  } = useTaskStore();

  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilterKey>('all');
  const [priorityFilter, setPriorityFilter] = React.useState<Set<Priority>>(new Set());
  const [dueDateFilter, setDueDateFilter] = React.useState<DueDateFilterKey>('all');
  const [sort, setSort] = React.useState<TaskSortKey>('updatedAt');
  const [formMode, setFormMode] = React.useState<'new' | 'edit' | null>(null);
  const [completeCommitTaskId, setCompleteCommitTaskId] = React.useState<string | null>(null);
  const [deleteTaskConfirmId, setDeleteTaskConfirmId] = React.useState<string | null>(null);
  const [createBranchOpen, setCreateBranchOpen] = React.useState(false);
  const [newBranchName, setNewBranchName] = React.useState('');
  const hasAutoSelected = React.useRef(false);

  React.useEffect(() => {
    if (repositoryId) {
      void loadData(repositoryId);
    }
  }, [repositoryId, loadData]);

  React.useEffect(() => {
    if (hasAutoSelected.current) return;
    if (tasks.length === 0 || selectedTaskId) return;
    hasAutoSelected.current = true;
    const defaultTask = tasks.find((t) => t.title === DEFAULT_SELECTED_TITLE);
    selectTask(defaultTask?.id ?? tasks[0]?.id ?? null);
  }, [tasks, selectedTaskId, selectTask]);

  React.useEffect(() => {
    if (selectedTaskId) {
      void loadDetail(selectedTaskId);
    }
  }, [selectedTaskId, loadDetail]);

  const activeBranch = React.useMemo(
    () => branches.find((b) => b.id === activeBranchId) ?? null,
    [branches, activeBranchId]
  );

  const activeBranchName = activeBranch?.name ?? '';

  const branchTaskCounts = React.useMemo(
    () => getBranchTaskCounts(allRepositoryTasks, branches),
    [allRepositoryTasks, branches]
  );

  const statusCounts = React.useMemo<StatusCounts>(() => getStatusCounts(tasks), [tasks]);

  const filteredTasks = React.useMemo<Task[]>(() => {
    const prioritySet = priorityFilter;
    const matched = tasks.filter((task) => {
      if (!matchesStatusFilter(task, statusFilter)) return false;
      if (!matchesDueDateFilter(task, dueDateFilter)) return false;
      if (prioritySet.size > 0 && !prioritySet.has(task.priority)) return false;
      if (!matchesSearch(task, query, activeBranchName)) return false;
      return true;
    });
    return sortTasks(matched, sort);
  }, [tasks, statusFilter, priorityFilter, dueDateFilter, query, activeBranchName, sort]);

  const selectedTask =
    (detailTask && detailTask.id === selectedTaskId ? detailTask : null) ??
    tasks.find((t) => t.id === selectedTaskId) ??
    allRepositoryTasks.find((t) => t.id === selectedTaskId) ??
    null;

  const completeCommitTask = React.useMemo(
    () =>
      completeCommitTaskId
        ? allRepositoryTasks.find((t) => t.id === completeCommitTaskId) ??
          tasks.find((t) => t.id === completeCommitTaskId) ??
          null
        : null,
    [completeCommitTaskId, allRepositoryTasks, tasks]
  );

  const handleSelectBranch = (branchId: string): void => {
    switchBranch(branchId);
    setFormMode(null);
    setCompleteCommitTaskId(null);
  };

  const handleSelectTask = (task: Task): void => {
    selectTask(task.id);
    setFormMode(null);
    setCompleteCommitTaskId(null);
  };

  const handleNewTask = (): void => {
    selectTask(null);
    setFormMode('new');
    setCompleteCommitTaskId(null);
  };

  const handleEditTask = (): void => {
    setFormMode('edit');
    setCompleteCommitTaskId(null);
  };

  const handleCancelForm = (): void => {
    setFormMode(null);
  };

  const handleSubmitForm = async (data: TaskFormData): Promise<void> => {
    if (formMode === 'new') {
      const dueDate = data.dueDate ? new Date(data.dueDate) : null;
      const task = await createTask({
        title: data.title,
        description: data.description,
        priority: data.priority,
        dueDate,
        branchId: data.branchId,
      });
      if (task) {
        selectTask(task.id);
        setFormMode(null);
      }
    } else if (formMode === 'edit' && selectedTaskId) {
      const dueDate = data.dueDate ? new Date(data.dueDate) : null;
      await updateTask(selectedTaskId, {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        dueDate,
      });
      setFormMode(null);
      if (selectedTaskId) void loadDetail(selectedTaskId);
    }
  };

  const handleCompleteAndCommit = (): void => {
    if (selectedTaskId) {
      setCompleteCommitTaskId(selectedTaskId);
      setFormMode(null);
    }
  };

  const handleConfirmCompleteCommit = async (input: {
    type: CommitType;
    title: string;
    description: string;
  }): Promise<void> => {
    if (!completeCommitTaskId) return;
    await completeAndCommit(completeCommitTaskId, input.type, input.title, input.description);
    setCompleteCommitTaskId(null);
    if (completeCommitTaskId) void loadDetail(completeCommitTaskId);
  };

  const handleRestore = async (): Promise<void> => {
    if (!selectedTaskId) return;
    await restoreTask(selectedTaskId);
    void loadDetail(selectedTaskId);
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteTaskConfirmId) return;
    await deleteTask(deleteTaskConfirmId);
    setDeleteTaskConfirmId(null);
  };

  const handleCreateBranch = async (name: string): Promise<void> => {
    const parent = activeBranch ?? branches[0] ?? undefined;
    await createBranch(name, {
      parentBranchId: parent?.id,
      color: parent?.color,
    });
  };

  const savedViewActive = statusFilter === TaskStatus.done;

  const clearFilters = (): void => {
    setQuery('');
    setStatusFilter('all');
    setPriorityFilter(new Set());
    setDueDateFilter('all');
  };

  const togglePriority = (priority: Priority): void => {
    const next = new Set(priorityFilter);
    if (next.has(priority)) {
      next.delete(priority);
    } else {
      next.add(priority);
    }
    setPriorityFilter(next);
  };

  const handleSavedViewClick = (): void => {
    setStatusFilter(savedViewActive ? 'all' : 2);
  };

  if (!isLoading && !repository) {
    return (
      <V3AppShell currentRepositoryId={repositoryId}>
        <div className="flex min-h-[calc(100vh-68px-48px)] flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-[18px] font-semibold text-[var(--v3-text-strong)]">仓库不存在</p>
          <p className="text-[14px] text-[var(--v3-text-secondary)]">
            这个仓库可能已被删除或链接已失效。
          </p>
        </div>
      </V3AppShell>
    );
  }

  return (
    <V3AppShell currentRepositoryId={repositoryId}>
      <div className="flex min-h-[calc(100vh-68px-48px)] flex-col gap-5 p-5 desktop:p-6">
        <header className="flex flex-col gap-1">
          <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--v3-primary)]">
            Repository Tasks
          </span>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-[40px] font-bold leading-[1.05] text-[var(--v3-text-strong)]">
                任务
              </h1>
              <div className="flex items-center gap-2 text-[14px]">
                <span className="text-[var(--v3-text)]">{repository?.name}</span>
                <span className="text-[var(--v3-text-muted)]">/</span>
                <span className="font-mono text-[16px] text-[var(--v3-primary)]">
                  {activeBranchName}
                </span>
                <span className="text-[var(--v3-text-muted)]">
                  当前分支 · {tasks.length} 个任务
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <V3Button variant="secondary" onClick={() => setCreateBranchOpen(true)} className="gap-1.5">
                <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
                新建分支
              </V3Button>
              <V3Button onClick={handleNewTask} className="gap-1.5">
                <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
                新建任务
              </V3Button>
            </div>
          </div>
        </header>

        <BranchTabs
          branches={branches}
          activeBranchId={activeBranchId}
          counts={branchTaskCounts}
          onSelect={handleSelectBranch}
          manageAction={
            <BranchManagementMenu
              branches={branches}
              activeBranchId={activeBranchId}
              onCreateBranch={(name) => void handleCreateBranch(name)}
              onRenameBranch={renameBranch}
              onMergeBranch={mergeBranch}
              onDeleteBranch={deleteBranch}
            />
          }
        />

        {error ? (
          <div
            className="flex items-center justify-between rounded-[var(--v3-radius-md)] border border-[var(--v3-danger)]/30 bg-[var(--v3-danger)]/10 px-4 py-3 text-[14px] text-[var(--v3-danger)]"
          >
            <span>{error}</span>
            <button type="button" onClick={clearError} className="underline">
              清除
            </button>
          </div>
        ) : null}

        <div className="flex flex-1 gap-5">
          <div className="hidden desktop:block">
            <FilterSidebar
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              priorityFilter={priorityFilter}
              onPriorityToggle={togglePriority}
              counts={statusCounts}
              savedViewActive={savedViewActive}
              onSavedViewClick={handleSavedViewClick}
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <TaskTable
              tasks={filteredTasks}
              selectedTaskId={selectedTaskId}
              branchName={activeBranchName}
              query={query}
              onQueryChange={setQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              priorityFilter={priorityFilter}
              onPriorityFilterChange={setPriorityFilter}
              dueDateFilter={dueDateFilter}
              onDueDateFilterChange={setDueDateFilter}
              sort={sort}
              onSortChange={setSort}
              onSelectTask={handleSelectTask}
              onToggleComplete={(task) => void completeAndCommit(task.id, CommitType.complete, task.title)}
              onNewTask={handleNewTask}
              onClearFilters={clearFilters}
              emptyBranch={tasks.length === 0}
            />
          </div>

          <div className="hidden w-[357px] flex-shrink-0 desktop:block">
            {completeCommitTask ? (
              <CompleteCommitPanel
                task={completeCommitTask}
                onConfirm={handleConfirmCompleteCommit}
                onCancel={() => setCompleteCommitTaskId(null)}
                isLoading={isLoading}
              />
            ) : formMode ? (
              <TaskFormPanel
                mode={formMode}
                task={formMode === 'edit' ? selectedTask : null}
                branches={branches}
                activeBranchId={activeBranchId}
                onSubmit={handleSubmitForm}
                onCancel={handleCancelForm}
                isLoading={isLoading}
              />
            ) : (
              <TaskDetailPanel
                task={selectedTask}
                commits={detailCommits}
                branchName={activeBranchName}
                repositoryName={repository?.name ?? ''}
                onEdit={handleEditTask}
                onRestore={handleRestore}
                onDelete={() => selectedTaskId && setDeleteTaskConfirmId(selectedTaskId)}
                onCompleteAndCommit={handleCompleteAndCommit}
                onClose={() => selectTask(null)}
              />
            )}
          </div>
        </div>

        <ConfirmDialog
          open={deleteTaskConfirmId !== null}
          title="删除任务"
          description="确定要删除这个任务吗？删除后可以在数据管理中恢复。"
          confirmLabel="删除"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTaskConfirmId(null)}
        />

        {createBranchOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <V3Card className="w-full max-w-[380px] p-5">
              <h3 className="text-[16px] font-semibold text-[var(--v3-text-strong)]">新建分支</h3>
              <p className="mt-1 text-[14px] text-[var(--v3-text-secondary)]">
                从当前分支 {activeBranchName || 'main'} 派生出新分支。
              </p>
              <input
                type="text"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="分支名称"
                autoFocus
                className="mt-4 h-10 w-full rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-3 text-[14px] text-[var(--v3-text)] outline-none placeholder:text-[var(--v3-text-muted)] focus-visible:[box-shadow:var(--v3-focus-ring)]"
              />
              <div className="mt-5 flex justify-end gap-2">
                <V3Button variant="secondary" onClick={() => { setCreateBranchOpen(false); setNewBranchName(''); }}>
                  取消
                </V3Button>
                <V3Button
                  onClick={() => {
                    void handleCreateBranch(newBranchName).then(() => {
                      setCreateBranchOpen(false);
                      setNewBranchName('');
                    });
                  }}
                  disabled={!newBranchName.trim()}
                >
                  创建
                </V3Button>
              </div>
            </V3Card>
          </div>
        ) : null}
      </div>
    </V3AppShell>
  );
}
