import { container } from '../../core/di/injection-container';
import { Branch } from '../../domain/entities/branch';
import { Commit } from '../../domain/entities/commit';
import { CommitType, Priority, TaskStatus } from '../../domain/entities/enums';
import { Repository } from '../../domain/entities/repository';
import { Task } from '../../domain/entities/task';
import { IBranchRepository } from '../../domain/repositories/i-branch-repository';
import { ICommitRepository } from '../../domain/repositories/i-commit-repository';
import { IRepositoryRepository } from '../../domain/repositories/i-repository-repository';
import { ITaskRepository } from '../../domain/repositories/i-task-repository';
import { CreateBranchUseCase } from '../../application/usecases/branch/create-branch-usecase';
import { DeleteBranchUseCase } from '../../application/usecases/branch/delete-branch-usecase';
import { MergeBranchUseCase } from '../../application/usecases/branch/merge-branch-usecase';
import { CompleteTaskUseCase } from '../../application/usecases/task/complete-task-usecase';
import { CreateTaskUseCase } from '../../application/usecases/task/create-task-usecase';
import { DeleteTaskUseCase } from '../../application/usecases/task/delete-task-usecase';
import { UpdateTaskUseCase } from '../../application/usecases/task/update-task-usecase';
import { create } from 'zustand';

export interface CreateTaskParams {
  title: string;
  description?: string | null;
  priority?: Priority;
  dueDate?: Date | null;
  parentTaskId?: string | null;
  branchId?: string;
}

export interface RepositoryState {
  repository: Repository | null;
  branches: Branch[];
  tasks: Task[];
  allRepositoryTasks: Task[];
  activeBranchId: string | null;
  selectedTaskId: string | null;
  isLoading: boolean;
  error: string | null;

  loadData: (repositoryId: string) => Promise<void>;
  switchBranch: (branchId: string | null) => void;
  selectTask: (taskId: string | null) => void;
  createTask: (params: CreateTaskParams) => Promise<Task | null>;
  updateTask: (id: string, updates: Partial<{ title: string; description: string | null; priority: Priority; dueDate: Date | null; status: TaskStatus }>) => Promise<Task | null>;
  completeTask: (taskId: string) => Promise<void>;
  completeAndCommit: (taskId: string, type: CommitType, title: string, description?: string | null) => Promise<void>;
  restoreTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  createBranch: (name: string, options?: { parentBranchId?: string | null; color?: string }) => Promise<Branch | null>;
  renameBranch: (branchId: string, name: string) => Promise<void>;
  mergeBranch: (sourceId: string, targetId: string) => Promise<void>;
  deleteBranch: (branchId: string) => Promise<void>;
  clearError: () => void;
}

export const useRepositoryStore = create<RepositoryState>((set, get) => {
  const repoRepository = container.resolve<IRepositoryRepository>('IRepositoryRepository');
  const branchRepository = container.resolve<IBranchRepository>('IBranchRepository');
  const taskRepository = container.resolve<ITaskRepository>('ITaskRepository');
  const commitRepository = container.resolve<ICommitRepository>('ICommitRepository');

  const createTaskUseCase = container.resolve(CreateTaskUseCase);
  const updateTaskUseCase = container.resolve(UpdateTaskUseCase);
  const completeTaskUseCase = container.resolve(CompleteTaskUseCase);
  const deleteTaskUseCase = container.resolve(DeleteTaskUseCase);
  const createBranchUseCase = container.resolve(CreateBranchUseCase);
  const mergeBranchUseCase = container.resolve(MergeBranchUseCase);
  const deleteBranchUseCase = container.resolve(DeleteBranchUseCase);

  const refreshAllTasks = async (state: RepositoryState) => {
    if (!state.repository) return;
    const allRepositoryTasks = await taskRepository.searchInRepository(state.repository.id, '');
    const branchId = state.activeBranchId;
    const tasks = branchId ? await taskRepository.getByBranchId(branchId) : [];
    set({ allRepositoryTasks, tasks });
  };

  return {
    repository: null,
    branches: [],
    tasks: [],
    allRepositoryTasks: [],
    activeBranchId: null,
    selectedTaskId: null,
    isLoading: false,
    error: null,

    loadData: async (repositoryId) => {
      set({ isLoading: true, error: null });
      try {
        const [repository, branches] = await Promise.all([
          repoRepository.getById(repositoryId),
          branchRepository.getByRepositoryId(repositoryId),
        ]);
        if (!repository) {
          set({ repository: null, branches: [], tasks: [], activeBranchId: null, isLoading: false });
          return;
        }
        const activeBranchId =
          get().activeBranchId && branches.some((b) => b.id === get().activeBranchId)
            ? get().activeBranchId
            : branches.find((b) => b.isMain)?.id ?? branches[0]?.id ?? null;

        const tasks = activeBranchId ? await taskRepository.getByBranchId(activeBranchId) : [];
        const allRepositoryTasks = await taskRepository.searchInRepository(repositoryId, '');
        set({ repository, branches, tasks, allRepositoryTasks, activeBranchId, isLoading: false });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : '加载仓库失败', isLoading: false });
      }
    },

    switchBranch: (branchId) => {
      set({ activeBranchId: branchId, selectedTaskId: null });
      if (branchId) {
        taskRepository
          .getByBranchId(branchId)
          .then((tasks) => set({ tasks }))
          .catch((err) => set({ error: err instanceof Error ? err.message : '加载任务失败' }));
      }
    },

    selectTask: (taskId) => set({ selectedTaskId: taskId }),

    createTask: async (params) => {
      const state = get();
      const branchId = params.branchId ?? state.activeBranchId;
      if (!branchId) {
        set({ error: '未选择分支' });
        return null;
      }
      set({ isLoading: true, error: null });
      try {
        const task = await createTaskUseCase.execute({ ...params, branchId });
        await refreshAllTasks(get());
        set({ isLoading: false });
        return task;
      } catch (err) {
        set({ error: err instanceof Error ? err.message : '创建任务失败', isLoading: false });
        return null;
      }
    },

    updateTask: async (id, updates) => {
      set({ isLoading: true, error: null });
      try {
        const task = await updateTaskUseCase.execute({ id, ...updates });
        await refreshAllTasks(get());
        set({ isLoading: false });
        return task;
      } catch (err) {
        set({ error: err instanceof Error ? err.message : '更新任务失败', isLoading: false });
        return null;
      }
    },

    completeTask: async (taskId) => {
      set({ isLoading: true, error: null });
      try {
        await completeTaskUseCase.execute(taskId);
        await refreshAllTasks(get());
        set({ isLoading: false });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : '完成任务失败', isLoading: false });
      }
    },

    completeAndCommit: async (taskId, type, title, description) => {
      set({ isLoading: true, error: null });
      try {
        const task = await taskRepository.getById(taskId);
        if (!task) {
          throw new Error('任务不存在');
        }
        if (task.isCompleted) {
          throw new Error('任务已经完成');
        }
        const completed = task.copyWith({
          status: TaskStatus.done,
          completedAt: new Date(),
        });
        const result = await taskRepository.update(completed);
        const message = [title.trim() || `完成任务 ${result.title}`, description?.trim()]
          .filter(Boolean)
          .join('\n\n');
        const commit = Commit.create(result.id, result.branchId, message, type);
        await commitRepository.create(commit);
        await refreshAllTasks(get());
        set({ isLoading: false });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : '完成并提交失败', isLoading: false });
      }
    },

    restoreTask: async (taskId) => {
      set({ isLoading: true, error: null });
      try {
        const task = await taskRepository.getById(taskId);
        if (!task) {
          throw new Error('任务不存在');
        }
        const restored = task.copyWith({
          status: TaskStatus.todo,
          completedAt: null,
        });
        await taskRepository.update(restored);
        await commitRepository.create(
          Commit.create(restored.id, restored.branchId, `恢复任务 ${restored.title}`, CommitType.update)
        );
        await refreshAllTasks(get());
        set({ isLoading: false });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : '恢复任务失败', isLoading: false });
      }
    },

    deleteTask: async (taskId) => {
      set({ isLoading: true, error: null });
      try {
        await deleteTaskUseCase.execute(taskId);
        await refreshAllTasks(get());
        set({ selectedTaskId: null, isLoading: false });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : '删除任务失败', isLoading: false });
      }
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
        const branches = await branchRepository.getByRepositoryId(state.repository.id);
        set({ branches, isLoading: false });
        return branch;
      } catch (err) {
        set({ error: err instanceof Error ? err.message : '创建分支失败', isLoading: false });
        return null;
      }
    },

    renameBranch: async (branchId, name) => {
      const state = get();
      if (!state.repository) {
        set({ error: '仓库未加载' });
        return;
      }
      set({ isLoading: true, error: null });
      try {
        const branch = await branchRepository.getById(branchId);
        if (!branch) {
          throw new Error('分支不存在');
        }
        const updated = branch.copyWith({ name: name.trim() });
        await branchRepository.update(updated);
        const branches = await branchRepository.getByRepositoryId(state.repository.id);
        set({ branches, isLoading: false });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : '重命名分支失败', isLoading: false });
      }
    },

    mergeBranch: async (sourceId, targetId) => {
      set({ isLoading: true, error: null });
      try {
        await mergeBranchUseCase.execute(sourceId, targetId);
        const state = get();
        if (state.repository) {
          const branches = await branchRepository.getByRepositoryId(state.repository.id);
          const tasks = state.activeBranchId ? await taskRepository.getByBranchId(state.activeBranchId) : [];
          const allRepositoryTasks = await taskRepository.searchInRepository(state.repository.id, '');
          set({ branches, tasks, allRepositoryTasks, isLoading: false });
        }
      } catch (err) {
        set({ error: err instanceof Error ? err.message : '合并分支失败', isLoading: false });
      }
    },

    deleteBranch: async (branchId) => {
      set({ isLoading: true, error: null });
      try {
        await deleteBranchUseCase.execute(branchId);
        const state = get();
        if (state.repository) {
          const branches = await branchRepository.getByRepositoryId(state.repository.id);
          let activeBranchId = state.activeBranchId;
          if (activeBranchId === branchId) {
            activeBranchId = branches.find((b) => b.isMain)?.id ?? branches[0]?.id ?? null;
          }
          const tasks = activeBranchId ? await taskRepository.getByBranchId(activeBranchId) : [];
          const allRepositoryTasks = await taskRepository.searchInRepository(state.repository.id, '');
          set({ branches, tasks, allRepositoryTasks, activeBranchId, isLoading: false });
        }
      } catch (err) {
        set({ error: err instanceof Error ? err.message : '删除分支失败', isLoading: false });
      }
    },

    clearError: () => set({ error: null }),
  };
});
