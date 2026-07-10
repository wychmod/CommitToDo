import { container } from '@/core/di/injection-container';
import { CreateBranchUseCase } from '@/application/usecases/branch/create-branch-usecase';
import { CreateTaskUseCase } from '@/application/usecases/task/create-task-usecase';
import { CompleteTaskUseCase } from '@/application/usecases/task/complete-task-usecase';
import { Branch } from '@/domain/entities/branch';
import { Commit } from '@/domain/entities/commit';
import { Priority, TaskStatus } from '@/domain/entities/enums';
import { Repository } from '@/domain/entities/repository';
import { Task } from '@/domain/entities/task';
import { IBranchRepository } from '@/domain/repositories/i-branch-repository';
import { ICommitRepository } from '@/domain/repositories/i-commit-repository';
import { IRepositoryRepository } from '@/domain/repositories/i-repository-repository';
import { ITaskRepository } from '@/domain/repositories/i-task-repository';
import { create } from 'zustand';

export interface CreateTaskParams {
  title: string;
  description?: string | null;
  priority?: Priority;
  dueDate?: Date | null;
  parentTaskId?: string | null;
}

export interface RepositoryOverviewState {
  repository: Repository | null;
  branches: Branch[];
  activeBranchId: string | null;
  allTasks: Task[];
  commits: Commit[];
  isLoading: boolean;
  error: string | null;

  load: (repositoryId: string) => Promise<void>;
  switchBranch: (branchId: string) => void;
  createBranch: (
    name: string,
    options?: {
      parentBranchId?: string | null;
      color?: string;
      description?: string | null;
    }
  ) => Promise<Branch | null>;
  createTask: (
    branchId: string,
    params: CreateTaskParams
  ) => Promise<Task | null>;
  completeTask: (taskId: string) => Promise<void>;
  clearError: () => void;
}

export const useRepositoryOverviewStore = create<RepositoryOverviewState>(
  (set, get) => {
    const repositoryRepo = container.resolve<IRepositoryRepository>(
      'IRepositoryRepository'
    );
    const branchRepository = container.resolve<IBranchRepository>(
      'IBranchRepository'
    );
    const taskRepository = container.resolve<ITaskRepository>(
      'ITaskRepository'
    );
    const commitRepository = container.resolve<ICommitRepository>(
      'ICommitRepository'
    );

    const createBranchUseCase = container.resolve(CreateBranchUseCase);
    const createTaskUseCase = container.resolve(CreateTaskUseCase);
    const completeTaskUseCase = container.resolve(CompleteTaskUseCase);

    const loadTasksForBranches = async (
      branches: Branch[]
    ): Promise<Task[]> => {
      if (branches.length === 0) return [];
      const lists = await Promise.all(
        branches.map((branch) => taskRepository.getByBranchId(branch.id))
      );
      return lists.flat();
    };

    const loadCommitsForBranches = async (
      branches: Branch[]
    ): Promise<Commit[]> => {
      if (branches.length === 0) return [];
      const lists = await Promise.all(
        branches.map((branch) => commitRepository.getByBranchId(branch.id))
      );
      return lists
        .flat()
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    };

    const resolveActiveBranchId = (
      branches: Branch[],
      current: string | null
    ): string | null => {
      if (current && branches.some((b) => b.id === current)) return current;
      return branches.find((b) => b.isMain)?.id ?? branches[0]?.id ?? null;
    };

    const refreshData = async (): Promise<void> => {
      const state = get();
      const repository = state.repository;
      if (!repository) return;
      try {
        const branches = await branchRepository.getByRepositoryId(repository.id);
        const [allTasks, commits] = await Promise.all([
          loadTasksForBranches(branches),
          loadCommitsForBranches(branches),
        ]);
        set({ branches, allTasks, commits });
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : '刷新数据失败',
        });
      }
    };

    return {
      repository: null,
      branches: [],
      activeBranchId: null,
      allTasks: [],
      commits: [],
      isLoading: false,
      error: null,

      load: async (repositoryId) => {
        set({ isLoading: true, error: null });
        try {
          const [repository, branches] = await Promise.all([
            repositoryRepo.getById(repositoryId),
            branchRepository.getByRepositoryId(repositoryId),
          ]);
          if (!repository) {
            set({
              repository: null,
              branches: [],
              activeBranchId: null,
              allTasks: [],
              commits: [],
              isLoading: false,
            });
            return;
          }
          const [allTasks, commits] = await Promise.all([
            loadTasksForBranches(branches),
            loadCommitsForBranches(branches),
          ]);
          const activeBranchId = resolveActiveBranchId(
            branches,
            get().activeBranchId
          );
          set({
            repository,
            branches,
            activeBranchId,
            allTasks,
            commits,
            isLoading: false,
          });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : '加载仓库失败',
            isLoading: false,
          });
        }
      },

      switchBranch: (branchId) => {
        set({ activeBranchId: branchId });
      },

      createBranch: async (name, options) => {
        const state = get();
        if (!state.repository) {
          set({ error: '仓库未加载' });
          return null;
        }
        set({ isLoading: true, error: null });
        try {
          const branch = await createBranchUseCase.execute({
            repositoryId: state.repository.id,
            name,
            parentBranchId: options?.parentBranchId,
            color: options?.color,
          });
          await refreshData();
          set({ activeBranchId: branch.id, isLoading: false });
          return branch;
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : '创建分支失败',
            isLoading: false,
          });
          return null;
        }
      },

      createTask: async (branchId, params) => {
        const state = get();
        if (!state.repository) {
          set({ error: '仓库未加载' });
          return null;
        }
        set({ isLoading: true, error: null });
        try {
          const task = await createTaskUseCase.execute({ branchId, ...params });
          await refreshData();
          set({ isLoading: false });
          return task;
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : '创建任务失败',
            isLoading: false,
          });
          return null;
        }
      },

      completeTask: async (taskId) => {
        const task = get().allTasks.find((t) => t.id === taskId);
        if (!task) {
          set({ error: '任务不存在' });
          return;
        }
        set({ isLoading: true, error: null });
        try {
          if (task.status === TaskStatus.done) {
            await taskRepository.update(
              task.copyWith({ status: TaskStatus.todo, completedAt: null })
            );
          } else {
            await completeTaskUseCase.execute(taskId);
          }
          await refreshData();
          set({ isLoading: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : '操作失败',
            isLoading: false,
          });
        }
      },

      clearError: () => set({ error: null }),
    };
  }
);
