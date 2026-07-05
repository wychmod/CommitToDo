import { container } from '../../core/di/injection-container';
import { Repository } from '../../domain/entities/repository';
import { IRepositoryRepository } from '../../domain/repositories/i-repository-repository';
import { CreateRepositoryUseCase } from '../../application/usecases/repository/create-repository-usecase';
import { DeleteRepositoryUseCase } from '../../application/usecases/repository/delete-repository-usecase';
import { UpdateRepositoryUseCase } from '../../application/usecases/repository/update-repository-usecase';
import { create } from 'zustand';

export interface HomeState {
  repositories: Repository[];
  isLoading: boolean;
  error: string | null;

  load: () => Promise<void>;
  createRepository: (name: string, icon?: string, color?: string) => Promise<Repository | null>;
  updateRepository: (id: string, updates: Partial<{ name: string; icon: string; color: string }>) => Promise<void>;
  deleteRepository: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useHomeStore = create<HomeState>((set, get) => {
  const repoRepository = container.resolve<IRepositoryRepository>('IRepositoryRepository');
  const createRepoUseCase = container.resolve(CreateRepositoryUseCase);
  const updateRepoUseCase = container.resolve(UpdateRepositoryUseCase);
  const deleteRepoUseCase = container.resolve(DeleteRepositoryUseCase);

  return {
    repositories: [],
    isLoading: false,
    error: null,

    load: async () => {
      set({ isLoading: true, error: null });
      try {
        const repositories = await repoRepository.getAll();
        set({ repositories, isLoading: false });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : '加载仓库失败', isLoading: false });
      }
    },

    createRepository: async (name, icon = 'repository', color = '#3B82F6') => {
      set({ isLoading: true, error: null });
      try {
        const created = await createRepoUseCase.execute({ name, icon, color });
        await get().load();
        return created;
      } catch (err) {
        set({ error: err instanceof Error ? err.message : '创建仓库失败', isLoading: false });
        return null;
      }
    },

    updateRepository: async (id, updates) => {
      set({ isLoading: true, error: null });
      try {
        await updateRepoUseCase.execute({ id, ...updates });
        await get().load();
      } catch (err) {
        set({ error: err instanceof Error ? err.message : '更新仓库失败', isLoading: false });
      }
    },

    deleteRepository: async (id) => {
      set({ isLoading: true, error: null });
      try {
        await deleteRepoUseCase.execute(id);
        await get().load();
      } catch (err) {
        set({ error: err instanceof Error ? err.message : '删除仓库失败', isLoading: false });
      }
    },

    clearError: () => set({ error: null }),
  };
});
