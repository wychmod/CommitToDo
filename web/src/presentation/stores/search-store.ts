import { container } from '../../core/di/injection-container';
import { Branch } from '../../domain/entities/branch';
import { Repository } from '../../domain/entities/repository';
import { Task } from '../../domain/entities/task';
import { IBranchRepository } from '../../domain/repositories/i-branch-repository';
import { IRepositoryRepository } from '../../domain/repositories/i-repository-repository';
import { ITaskRepository } from '../../domain/repositories/i-task-repository';
import { create } from 'zustand';

export interface SearchResult {
  tasks: Task[];
  branches: Branch[];
  repositories: Repository[];
}

export interface SearchState extends SearchResult {
  query: string;
  isLoading: boolean;
  error: string | null;

  setQuery: (query: string) => void;
  search: (query: string) => Promise<void>;
  clear: () => void;
}

export const useSearchStore = create<SearchState>((set) => {
  const taskRepository = container.resolve<ITaskRepository>('ITaskRepository');
  const branchRepository = container.resolve<IBranchRepository>('IBranchRepository');
  const repositoryRepository = container.resolve<IRepositoryRepository>('IRepositoryRepository');

  return {
    query: '',
    tasks: [],
    branches: [],
    repositories: [],
    isLoading: false,
    error: null,

    setQuery: (query) => set({ query }),

    search: async (query) => {
      const trimmed = query.trim();
      set({ query, isLoading: true, error: null });
      try {
        if (!trimmed) {
          set({ tasks: [], branches: [], repositories: [], isLoading: false });
          return;
        }
        const [tasks, branches, repositories] = await Promise.all([
          taskRepository.search(trimmed),
          branchRepository.search(trimmed),
          repositoryRepository.search(trimmed),
        ]);
        set({ tasks, branches, repositories, isLoading: false });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : '搜索失败', isLoading: false });
      }
    },

    clear: () => set({ query: '', tasks: [], branches: [], repositories: [], error: null }),
  };
});
