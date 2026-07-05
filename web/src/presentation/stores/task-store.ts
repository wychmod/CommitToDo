import { container } from '../../core/di/injection-container';
import { Commit } from '../../domain/entities/commit';
import { Priority, TaskStatus } from '../../domain/entities/enums';
import { Task } from '../../domain/entities/task';
import { ICommitRepository } from '../../domain/repositories/i-commit-repository';
import { ITaskRepository } from '../../domain/repositories/i-task-repository';
import { CompleteTaskUseCase } from '../../application/usecases/task/complete-task-usecase';
import { DeleteTaskUseCase } from '../../application/usecases/task/delete-task-usecase';
import { UpdateTaskUseCase } from '../../application/usecases/task/update-task-usecase';
import { create } from 'zustand';

export interface TaskState {
  task: Task | null;
  commits: Commit[];
  isLoading: boolean;
  error: string | null;

  load: (taskId: string) => Promise<void>;
  updateTask: (id: string, updates: Partial<{ title: string; description: string | null; priority: Priority; dueDate: Date | null; status: TaskStatus }>) => Promise<Task | null>;
  completeTask: () => Promise<void>;
  deleteTask: () => Promise<void>;
  clearError: () => void;
}

export const useTaskStore = create<TaskState>((set, get) => {
  const taskRepository = container.resolve<ITaskRepository>('ITaskRepository');
  const commitRepository = container.resolve<ICommitRepository>('ICommitRepository');
  const completeTaskUseCase = container.resolve(CompleteTaskUseCase);
  const deleteTaskUseCase = container.resolve(DeleteTaskUseCase);
  const updateTaskUseCase = container.resolve(UpdateTaskUseCase);

  const refresh = async (taskId: string) => {
    const [task, commits] = await Promise.all([
      taskRepository.getById(taskId),
      commitRepository.getByTaskId(taskId),
    ]);
    set({ task, commits });
  };

  return {
    task: null,
    commits: [],
    isLoading: false,
    error: null,

    load: async (taskId) => {
      set({ isLoading: true, error: null });
      try {
        await refresh(taskId);
        set({ isLoading: false });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : '加载任务失败', isLoading: false });
      }
    },

    updateTask: async (id, updates) => {
      set({ isLoading: true, error: null });
      try {
        const task = await updateTaskUseCase.execute({ id, ...updates });
        if (task) await refresh(task.id);
        set({ isLoading: false });
        return task;
      } catch (err) {
        set({ error: err instanceof Error ? err.message : '更新任务失败', isLoading: false });
        return null;
      }
    },

    completeTask: async () => {
      const state = get();
      if (!state.task) return;
      set({ isLoading: true, error: null });
      try {
        await completeTaskUseCase.execute(state.task.id);
        await refresh(state.task.id);
        set({ isLoading: false });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : '完成任务失败', isLoading: false });
      }
    },

    deleteTask: async () => {
      const state = get();
      if (!state.task) return;
      set({ isLoading: true, error: null });
      try {
        await deleteTaskUseCase.execute(state.task.id);
        set({ task: null, commits: [], isLoading: false });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : '删除任务失败', isLoading: false });
      }
    },

    clearError: () => set({ error: null }),
  };
});
