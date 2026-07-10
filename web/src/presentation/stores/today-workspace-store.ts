import { addDays, isSameDay, startOfDay } from 'date-fns';
import { create } from 'zustand';

import { container } from '@/core/di/injection-container';
import { CreateRepositoryUseCase } from '@/application/usecases/repository/create-repository-usecase';
import { CreateTaskUseCase } from '@/application/usecases/task/create-task-usecase';
import { CompleteTaskUseCase } from '@/application/usecases/task/complete-task-usecase';
import { UpdateTaskUseCase } from '@/application/usecases/task/update-task-usecase';
import { DataExportService } from '@/domain/services/data-export-service';
import { Branch } from '@/domain/entities/branch';
import { Commit } from '@/domain/entities/commit';
import { Priority, TaskStatus } from '@/domain/entities/enums';
import { Repository } from '@/domain/entities/repository';
import { Task } from '@/domain/entities/task';
import { IBranchRepository } from '@/domain/repositories/i-branch-repository';
import { ICommitRepository } from '@/domain/repositories/i-commit-repository';
import { IRepositoryRepository } from '@/domain/repositories/i-repository-repository';
import { ITaskRepository } from '@/domain/repositories/i-task-repository';

export type WorkspaceFilter = 'all' | 'today' | 'overdue' | 'pendingCommit';

export interface TaskGroup {
  repository: Repository;
  branch: Branch;
  tasks: Task[];
}

export interface HeatmapDay {
  date: Date;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface Progress {
  done: number;
  total: number;
  overdue: number;
  estimateMinutes: number;
}

export interface RecentRepositoryItem {
  repository: Repository;
  mainBranch: Branch | null;
  taskCount: number;
  lastActivityAt: Date;
}

export interface CreateTaskParams {
  branchId: string;
  title: string;
  description?: string | null;
  priority?: Priority;
  dueDate?: Date | null;
}

export interface CreateRepositoryParams {
  name: string;
  description?: string;
  defaultBranch?: string;
  color?: string;
}

export interface TodayWorkspaceState {
  repositories: Repository[];
  branches: Branch[];
  tasks: Task[];
  commits: Commit[];
  isLoading: boolean;
  error: string | null;
  filter: WorkspaceFilter;
  priorityFilter: Priority | null;
  showCompleted: boolean;
  selectedTaskId: string | null;
  isTaskFormOpen: boolean;
  isCreateRepoOpen: boolean;
  taskFormDefaults: { repositoryId: string; branchId: string } | null;

  load: () => Promise<void>;
  refresh: () => Promise<void>;
  setFilter: (filter: WorkspaceFilter) => void;
  setPriorityFilter: (priority: Priority | null) => void;
  toggleShowCompleted: () => void;
  openTaskForm: () => void;
  closeTaskForm: () => void;
  openCreateRepo: () => void;
  closeCreateRepo: () => void;
  selectTask: (taskId: string | null) => Promise<void>;
  createTask: (params: CreateTaskParams) => Promise<Task | null>;
  toggleCompleteTask: (taskId: string) => Promise<void>;
  createRepository: (params: CreateRepositoryParams) => Promise<Repository | null>;
  exportDiagnostics: () => Promise<string>;
}

export function getProgress(tasks: Task[]): Progress {
  const total = tasks.length;
  const done = tasks.filter((t) => t.isCompleted).length;
  const overdue = tasks.filter((t) => !t.isCompleted && t.isOverdue).length;
  const estimateMinutes = tasks
    .filter((t) => !t.isCompleted)
    .reduce((sum, t) => {
      const minutes =
        t.priority === Priority.high ? 60 : t.priority === Priority.low ? 15 : 30;
      return sum + minutes;
    }, 0);
  return { done, total, overdue, estimateMinutes };
}

export function getFilteredTasks(
  tasks: Task[],
  filter: WorkspaceFilter,
  priorityFilter: Priority | null,
  showCompleted: boolean
): Task[] {
  const today = startOfDay(new Date());
  return tasks.filter((task) => {
    if (!showCompleted && task.isCompleted) return false;
    if (priorityFilter !== null && task.priority !== priorityFilter) return false;

    switch (filter) {
      case 'today':
        return task.dueDate ? isSameDay(task.dueDate, today) : false;
      case 'overdue':
        return !task.isCompleted && task.isOverdue;
      case 'pendingCommit':
        return task.status === TaskStatus.done;
      case 'all':
      default:
        return true;
    }
  });
}

export function getTaskGroups(
  tasks: Task[],
  repositories: Repository[],
  branches: Branch[]
): TaskGroup[] {
  const repoMap = new Map(repositories.map((r) => [r.id, r]));
  const branchMap = new Map(branches.map((b) => [b.id, b]));

  const groups = new Map<string, TaskGroup>();
  for (const task of tasks) {
    const branch = branchMap.get(task.branchId);
    const repository = branch ? repoMap.get(branch.repositoryId) : undefined;
    if (!branch || !repository) continue;

    const key = `${repository.id}:${branch.id}`;
    const group = groups.get(key);
    if (group) {
      group.tasks.push(task);
    } else {
      groups.set(key, { repository, branch, tasks: [task] });
    }
  }

  const repoOrder = new Map(
    [...repositories]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .map((r, i) => [r.id, i])
  );

  return Array.from(groups.values()).sort((a, b) => {
    const orderDiff =
      (repoOrder.get(a.repository.id) ?? 0) - (repoOrder.get(b.repository.id) ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return a.branch.createdAt.getTime() - b.branch.createdAt.getTime();
  });
}

function getHeatmapLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

export function getWeekHeatmap(tasks: Task[]): HeatmapDay[] {
  const today = startOfDay(new Date());
  const days: HeatmapDay[] = [];
  const counts = new Map<string, number>();

  for (const task of tasks) {
    if (!task.completedAt) continue;
    const day = startOfDay(task.completedAt);
    counts.set(day.toISOString(), (counts.get(day.toISOString()) ?? 0) + 1);
  }

  for (let i = 34; i >= 0; i--) {
    const date = addDays(today, -i);
    const count = counts.get(date.toISOString()) ?? 0;
    days.push({ date, count, level: getHeatmapLevel(count) });
  }
  return days;
}

export function getRecentRepositories(
  repositories: Repository[],
  branches: Branch[],
  tasks: Task[]
): RecentRepositoryItem[] {
  const mainBranchByRepo = new Map<string, Branch>();
  for (const branch of branches) {
    if (branch.isMain && !mainBranchByRepo.has(branch.repositoryId)) {
      mainBranchByRepo.set(branch.repositoryId, branch);
    }
  }

  const tasksByRepo = new Map<string, number>();
  const lastActivityByRepo = new Map<string, Date>();
  for (const repo of repositories) {
    tasksByRepo.set(repo.id, 0);
    lastActivityByRepo.set(repo.id, repo.updatedAt);
  }

  for (const task of tasks) {
    const branch = branches.find((b) => b.id === task.branchId);
    if (!branch) continue;
    tasksByRepo.set(branch.repositoryId, (tasksByRepo.get(branch.repositoryId) ?? 0) + 1);
    const current = lastActivityByRepo.get(branch.repositoryId);
    if (!current || task.updatedAt.getTime() > current.getTime()) {
      lastActivityByRepo.set(branch.repositoryId, task.updatedAt);
    }
  }

  return [...repositories]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 5)
    .map((repository) => ({
      repository,
      mainBranch: mainBranchByRepo.get(repository.id) ?? null,
      taskCount: tasksByRepo.get(repository.id) ?? 0,
      lastActivityAt: lastActivityByRepo.get(repository.id) ?? repository.updatedAt,
    }));
}

function todayAt(hour: number, minute: number): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function seedDemoData(
  createRepositoryUseCase: CreateRepositoryUseCase,
  branchRepository: IBranchRepository,
  taskRepository: ITaskRepository
): Promise<void> {
  const today = startOfDay(new Date());
  const threeDaysAgo = addDays(today, -3);

  const sports = await createRepositoryUseCase.execute({
    name: '运动计划',
    color: '#80e48c',
  });
  const commit = await createRepositoryUseCase.execute({
    name: 'CommitToDo',
    color: '#59cbd0',
  });
  const reading = await createRepositoryUseCase.execute({
    name: '阅读清单',
    color: '#6e95ff',
  });

  const launchBranch = Branch.create(commit.id, 'launch', {
    color: commit.color,
  });
  await branchRepository.create(launchBranch);

  const sportsMain = (await branchRepository.getByRepositoryId(sports.id)).find(
    (b) => b.isMain
  );
  const commitMain = (await branchRepository.getByRepositoryId(commit.id)).find(
    (b) => b.isMain
  );
  const readingMain = (await branchRepository.getByRepositoryId(reading.id)).find(
    (b) => b.isMain
  );

  if (sportsMain) {
    await taskRepository.create(
      new Task({
        id: crypto.randomUUID(),
        branchId: sportsMain.id,
        title: '完成晨跑 5 km',
        description: null,
        status: TaskStatus.done,
        priority: Priority.medium,
        dueDate: todayAt(7, 12),
        completedAt: todayAt(7, 12),
        parentTaskId: null,
        sortOrder: 0,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );
    await taskRepository.create(
      new Task({
        id: crypto.randomUUID(),
        branchId: sportsMain.id,
        title: '整理下周训练任务',
        description: null,
        status: TaskStatus.inProgress,
        priority: Priority.high,
        dueDate: todayAt(16, 45),
        completedAt: null,
        parentTaskId: null,
        sortOrder: 1,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );
    await taskRepository.create(
      new Task({
        id: crypto.randomUUID(),
        branchId: sportsMain.id,
        title: '补充跑后拉伸计划',
        description: null,
        status: TaskStatus.todo,
        priority: Priority.low,
        dueDate: addDays(todayAt(9, 0), 1),
        completedAt: null,
        parentTaskId: null,
        sortOrder: 2,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );
  }

  if (commitMain) {
    await taskRepository.create(
      new Task({
        id: crypto.randomUUID(),
        branchId: commitMain.id,
        title: '确认首页视觉方向',
        description: null,
        status: TaskStatus.inProgress,
        priority: Priority.high,
        dueDate: todayAt(10, 0),
        completedAt: null,
        parentTaskId: null,
        sortOrder: 0,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );
  }

  await taskRepository.create(
    new Task({
      id: crypto.randomUUID(),
      branchId: launchBranch.id,
      title: '整理功能页面清单',
      description: null,
      status: TaskStatus.done,
      priority: Priority.medium,
      dueDate: addDays(todayAt(16, 20), -1),
      completedAt: addDays(todayAt(16, 20), -1),
      parentTaskId: null,
      sortOrder: 0,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  );

  if (readingMain) {
    await taskRepository.create(
      new Task({
        id: crypto.randomUUID(),
        branchId: readingMain.id,
        title: '阅读《深度工作》第三章',
        description: null,
        status: TaskStatus.todo,
        priority: Priority.medium,
        dueDate: threeDaysAgo,
        completedAt: null,
        parentTaskId: null,
        sortOrder: 0,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );
  }
}

export const useTodayWorkspaceStore = create<TodayWorkspaceState>((set, get) => {
  const repositoryRepository = container.resolve<IRepositoryRepository>('IRepositoryRepository');
  const branchRepository = container.resolve<IBranchRepository>('IBranchRepository');
  const taskRepository = container.resolve<ITaskRepository>('ITaskRepository');
  const commitRepository = container.resolve<ICommitRepository>('ICommitRepository');
  const createRepositoryUseCase = container.resolve(CreateRepositoryUseCase);
  const createTaskUseCase = container.resolve(CreateTaskUseCase);
  const completeTaskUseCase = container.resolve(CompleteTaskUseCase);
  const updateTaskUseCase = container.resolve(UpdateTaskUseCase);
  const dataExportService = container.resolve(DataExportService);

  const refresh = async (): Promise<void> => {
    const [repositories, branches, tasks] = await Promise.all([
      repositoryRepository.getAll(),
      branchRepository.getAll(),
      taskRepository.getAll(),
    ]);
    set({ repositories, branches, tasks });
  };

  const load = async (): Promise<void> => {
    set({ isLoading: true, error: null });
    try {
      let repositories = await repositoryRepository.getAll();
      if (repositories.length === 0) {
        await seedDemoData(createRepositoryUseCase, branchRepository, taskRepository);
        repositories = await repositoryRepository.getAll();
      }
      const [branches, tasks] = await Promise.all([
        branchRepository.getAll(),
        taskRepository.getAll(),
      ]);
      set({ repositories, branches, tasks, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '加载工作台失败',
        isLoading: false,
      });
    }
  };

  const openTaskForm = (): void => {
    const { repositories, branches } = get();
    const recentRepo = repositories[0];
    const defaultBranch = recentRepo
      ? branches.find((b) => b.repositoryId === recentRepo.id && b.isMain) ??
        branches.find((b) => b.repositoryId === recentRepo.id) ??
        null
      : null;
    set({
      isTaskFormOpen: true,
      taskFormDefaults:
        recentRepo && defaultBranch
          ? { repositoryId: recentRepo.id, branchId: defaultBranch.id }
          : null,
    });
  };

  const selectTask = async (taskId: string | null): Promise<void> => {
    set({ selectedTaskId: taskId });
    if (!taskId) {
      set({ commits: [] });
      return;
    }
    try {
      const commits = await commitRepository.getByTaskId(taskId);
      set({ commits });
    } catch {
      set({ commits: [] });
    }
  };

  return {
    repositories: [],
    branches: [],
    tasks: [],
    commits: [],
    isLoading: false,
    error: null,
    filter: 'all',
    priorityFilter: null,
    showCompleted: true,
    selectedTaskId: null,
    isTaskFormOpen: false,
    isCreateRepoOpen: false,
    taskFormDefaults: null,

    load,
    refresh,
    setFilter: (filter) => set({ filter }),
    setPriorityFilter: (priorityFilter) => set({ priorityFilter }),
    toggleShowCompleted: () => set((state) => ({ showCompleted: !state.showCompleted })),
    openTaskForm,
    closeTaskForm: () => set({ isTaskFormOpen: false }),
    openCreateRepo: () => set({ isCreateRepoOpen: true }),
    closeCreateRepo: () => set({ isCreateRepoOpen: false }),
    selectTask,

    createTask: async (params) => {
      set({ isLoading: true, error: null });
      try {
        const created = await createTaskUseCase.execute(params);
        await refresh();
        set({ isLoading: false, isTaskFormOpen: false });
        return created;
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : '创建任务失败',
          isLoading: false,
        });
        return null;
      }
    },

    toggleCompleteTask: async (taskId) => {
      const { tasks } = get();
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      set({ isLoading: true, error: null });
      try {
        if (task.isCompleted) {
          await updateTaskUseCase.execute({
            id: taskId,
            status: TaskStatus.todo,
            completedAt: null,
          });
        } else {
          await completeTaskUseCase.execute(taskId);
        }
        await refresh();
        const { selectedTaskId } = get();
        if (selectedTaskId === taskId) {
          await selectTask(taskId);
        }
        set({ isLoading: false });
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : '更新任务状态失败',
          isLoading: false,
        });
      }
    },

    createRepository: async (params) => {
      set({ isLoading: true, error: null });
      try {
        const created = await createRepositoryUseCase.execute({
          name: params.name,
          color: params.color,
        });
        if (params.defaultBranch && params.defaultBranch !== 'main') {
          const branch = Branch.create(created.id, params.defaultBranch, {
            color: params.color,
          });
          await branchRepository.create(branch);
        }
        await refresh();
        set({ isLoading: false, isCreateRepoOpen: false });
        return created;
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : '创建仓库失败',
          isLoading: false,
        });
        return null;
      }
    },

    exportDiagnostics: async () => {
      return dataExportService.export('json');
    },
  };
});
