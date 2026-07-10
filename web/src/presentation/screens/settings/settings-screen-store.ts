import { create } from 'zustand';

import { container } from '@/core/di/injection-container';
import { Branch } from '@/domain/entities/branch';
import { Repository } from '@/domain/entities/repository';
import { IBranchRepository } from '@/domain/repositories/i-branch-repository';
import { IRepositoryRepository } from '@/domain/repositories/i-repository-repository';
import { DeleteRepositoryUseCase } from '@/application/usecases/repository/delete-repository-usecase';
import { UpdateRepositoryUseCase } from '@/application/usecases/repository/update-repository-usecase';
import { DataExportService, ExportFormat } from '@/domain/services/data-export-service';
import { WebFileSaveService } from '@/platform/web-file-save-service';
import { WebNotificationService } from '@/platform/web-notification-service';
import { ImportDataUseCase, ImportMode, ImportResult } from '@/application/usecases/import-data-usecase';
import { useHomeStore } from '@/presentation/stores/home-store';

export type SettingsScope = 'app' | 'workspace' | 'repository';
export type SaveStatus = 'saved' | 'saving' | 'error' | 'offline';
export type PwaStatus = 'installable' | 'installed' | 'unsupported';
export type StorageStatus = 'saved' | 'saving' | 'error' | 'unavailable';

export interface ImportPreview {
  repositories: number;
  branches: number;
  tasks: number;
  commits: number;
}

interface DeferredPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface SettingsScreenState {
  scope: SettingsScope;
  repositories: Repository[];
  currentRepositoryId: string | null;
  branches: Branch[];
  storageStatus: StorageStatus;
  storageSizeBytes: number | null;
  lastSavedAt: Date | null;
  saveStatus: SaveStatus;
  pwaStatus: PwaStatus;
  deferredPrompt: DeferredPrompt | null;
  importDialogOpen: boolean;
  importFileName: string | null;
  importJson: string | null;
  importPreview: ImportPreview | null;
  importError: string | null;
  importExecuting: boolean;
  notificationPermission: NotificationPermission | 'unsupported';
  isLoading: boolean;
  error: string | null;
}

export interface SettingsScreenActions {
  load: () => Promise<void>;
  setScope: (scope: SettingsScope) => void;
  refreshSaveStatus: () => void;
  requestNotificationPermission: () => Promise<NotificationPermission | 'unsupported'>;
  exportData: (format: ExportFormat) => Promise<void>;
  openImportDialog: () => void;
  closeImportDialog: () => void;
  previewImportFile: (file: File) => Promise<void>;
  executeImport: (mode: ImportMode) => Promise<ImportResult | null>;
  updateCurrentRepository: (updates: {
    name?: string;
    description?: string | null;
    defaultBranchId?: string | null;
  }) => Promise<Repository | null>;
  archiveCurrentRepository: () => Promise<Repository | null>;
  deleteCurrentRepository: () => Promise<void>;
  installPwa: () => Promise<void>;
  setDeferredPrompt: (prompt: DeferredPrompt | null) => void;
  setPwaInstalled: () => void;
}

export type SettingsScreenStore = SettingsScreenState & SettingsScreenActions;

function resolveNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }
  return Notification.permission;
}

function isIndexedDbAvailable(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
}

async function estimateStorage(): Promise<number | null> {
  if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.estimate) {
    return null;
  }
  try {
    const estimate = await navigator.storage.estimate();
    return estimate.usage ?? null;
  } catch {
    return null;
  }
}

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return '未知大小';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatLastSaved(date: Date | null): string {
  if (!date) return '刚刚保存';
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return '刚刚保存';
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)} 分钟前保存`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)} 小时前保存`;
  return `${Math.floor(diffMs / 86_400_000)} 天前保存`;
}

function validateImportJson(json: string): ImportPreview {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('导入文件不是有效的 JSON');
  }

  if (typeof data !== 'object' || data === null) {
    throw new Error('导入文件格式错误');
  }

  const record = data as Record<string, unknown>;
  if (record.version !== 1) {
    throw new Error(`不支持的导出版本: ${String(record.version ?? '未知')}`);
  }

  const toLength = (value: unknown): number =>
    Array.isArray(value) ? value.length : 0;

  return {
    repositories: toLength(record.repositories),
    branches: toLength(record.branches),
    tasks: toLength(record.tasks),
    commits: toLength(record.commits),
  };
}

export const useSettingsScreenStore = create<SettingsScreenStore>((set, get) => {
  const repositoryRepo = container.resolve<IRepositoryRepository>('IRepositoryRepository');
  const branchRepo = container.resolve<IBranchRepository>('IBranchRepository');
  const updateRepositoryUseCase = container.resolve(UpdateRepositoryUseCase);
  const deleteRepositoryUseCase = container.resolve(DeleteRepositoryUseCase);
  const dataExportService = container.resolve(DataExportService);
  const fileSaveService = container.resolve(WebFileSaveService);
  const importDataUseCase = container.resolve(ImportDataUseCase);

  const refreshHomeStore = async (): Promise<void> => {
    await useHomeStore.getState().load();
  };

  const refreshRepositories = async (): Promise<Repository[]> => {
    const repositories = await repositoryRepo.getAll();
    set({ repositories });
    return repositories;
  };

  const loadCurrentRepo = async (repoId: string | null): Promise<void> => {
    if (!repoId) {
      set({ currentRepositoryId: null, branches: [] });
      return;
    }
    const [repository, branches] = await Promise.all([
      repositoryRepo.getById(repoId),
      branchRepo.getByRepositoryId(repoId),
    ]);
    if (!repository) {
      set({ currentRepositoryId: null, branches: [] });
      return;
    }
    set({
      currentRepositoryId: repository.id,
      branches: branches.filter((b) => !b.isDeleted),
    });
  };

  return {
    scope: 'app',
    repositories: [],
    currentRepositoryId: null,
    branches: [],
    storageStatus: isIndexedDbAvailable() ? 'saved' : 'unavailable',
    storageSizeBytes: null,
    lastSavedAt: new Date(),
    saveStatus: 'saved',
    pwaStatus: 'unsupported',
    deferredPrompt: null,
    importDialogOpen: false,
    importFileName: null,
    importJson: null,
    importPreview: null,
    importError: null,
    importExecuting: false,
    notificationPermission: resolveNotificationPermission(),
    isLoading: false,
    error: null,

    load: async () => {
      set({ isLoading: true, error: null });
      try {
        if (!isIndexedDbAvailable()) {
          set({ storageStatus: 'unavailable', isLoading: false });
          return;
        }

        const [repositories, usage] = await Promise.all([
          repositoryRepo.getAll(),
          estimateStorage(),
        ]);

        const activeRepo = repositories.find((r) => !r.isArchived) ?? repositories[0] ?? null;

        set({
          repositories,
          storageSizeBytes: usage,
          storageStatus: 'saved',
          lastSavedAt: new Date(),
          isLoading: false,
        });

        await loadCurrentRepo(activeRepo?.id ?? null);
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : '加载设置失败',
          isLoading: false,
          storageStatus: 'error',
        });
      }
    },

    setScope: (scope) => set({ scope }),

    refreshSaveStatus: () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        set({ saveStatus: 'offline', lastSavedAt: new Date() });
        return;
      }
      set({ saveStatus: 'saved', lastSavedAt: new Date() });
    },

    requestNotificationPermission: async () => {
      const service = container.resolve(WebNotificationService);
      const permission = await service.requestPermission();
      set({ notificationPermission: permission });
      return permission;
    },

    exportData: async (format) => {
      try {
        const content = await dataExportService.export(format);
        const extension = format === 'markdown' ? 'md' : format;
        fileSaveService.save({
          content,
          filename: `commit-export.${extension}`,
          mimeType:
            format === 'json'
              ? 'application/json'
              : format === 'csv'
                ? 'text/csv'
                : 'text/markdown',
        });
      } catch (err) {
        throw err instanceof Error ? err : new Error('导出失败');
      }
    },

    openImportDialog: () =>
      set({
        importDialogOpen: true,
        importFileName: null,
        importJson: null,
        importPreview: null,
        importError: null,
      }),

    closeImportDialog: () =>
      set({
        importDialogOpen: false,
        importFileName: null,
        importJson: null,
        importPreview: null,
        importError: null,
      }),

    previewImportFile: async (file) => {
      set({ importExecuting: true, importError: null });
      try {
        const json = await file.text();
        const preview = validateImportJson(json);
        set({
          importFileName: file.name,
          importJson: json,
          importPreview: preview,
          importExecuting: false,
        });
      } catch (err) {
        set({
          importError: err instanceof Error ? err.message : '文件解析失败',
          importExecuting: false,
          importPreview: null,
          importJson: null,
        });
      }
    },

    executeImport: async (mode) => {
      const { importJson } = get();
      if (!importJson) return null;
      set({ importExecuting: true, importError: null });
      try {
        const result = await importDataUseCase.execute(importJson, mode);
        await refreshHomeStore();
        await get().load();
        set({ importExecuting: false, importDialogOpen: false });
        return result;
      } catch (err) {
        set({
          importError: err instanceof Error ? err.message : '导入失败',
          importExecuting: false,
        });
        return null;
      }
    },

    updateCurrentRepository: async (updates) => {
      const { currentRepositoryId } = get();
      if (!currentRepositoryId) return null;
      try {
        const updated = await updateRepositoryUseCase.execute({
          id: currentRepositoryId,
          ...updates,
        });
        await loadCurrentRepo(currentRepositoryId);
        await refreshRepositories();
        await refreshHomeStore();
        set({ saveStatus: 'saved', lastSavedAt: new Date() });
        return updated;
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : '保存失败',
          saveStatus: 'error',
        });
        throw err;
      }
    },

    archiveCurrentRepository: async () => {
      const { currentRepositoryId } = get();
      if (!currentRepositoryId) return null;
      const updated = await updateRepositoryUseCase.execute({
        id: currentRepositoryId,
        isArchived: true,
      });
      await refreshRepositories();
      await loadCurrentRepo(currentRepositoryId);
      await refreshHomeStore();
      return updated;
    },

    deleteCurrentRepository: async () => {
      const { currentRepositoryId } = get();
      if (!currentRepositoryId) return;
      await deleteRepositoryUseCase.execute(currentRepositoryId);
      const repositories = await refreshRepositories();
      const nextCurrent = repositories.find((r) => !r.isArchived) ?? repositories[0] ?? null;
      await loadCurrentRepo(nextCurrent?.id ?? null);
      await refreshHomeStore();
    },

    installPwa: async () => {
      const { deferredPrompt, pwaStatus } = get();
      if (!deferredPrompt || pwaStatus !== 'installable') return;
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          set({ pwaStatus: 'installed', deferredPrompt: null });
        }
      } catch {
        // Keep installable if prompt failed.
      }
    },

    setDeferredPrompt: (prompt) =>
      set({ deferredPrompt: prompt, pwaStatus: 'installable' }),

    setPwaInstalled: () => set({ pwaStatus: 'installed', deferredPrompt: null }),
  };
});

export { formatBytes, formatLastSaved };
