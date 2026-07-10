import { describe, expect, it, beforeEach, vi } from 'vitest';

import { useSettingsScreenStore } from './settings-screen-store';
import { AppDatabase } from '@/data/db/app-database';
import { container } from '@/core/di/injection-container';
import { CreateRepositoryUseCase } from '@/application/usecases/repository/create-repository-usecase';
import { WebFileSaveService } from '@/platform/web-file-save-service';

Object.defineProperty(File.prototype, 'text', {
  value: function text(this: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (): void => resolve(String(reader.result ?? ''));
      reader.onerror = (): void => reject(new Error('读取文件失败'));
      reader.readAsText(this);
    });
  },
  configurable: true,
});

async function resetStore(): Promise<void> {
  useSettingsScreenStore.setState({
    scope: 'app',
    repositories: [],
    currentRepositoryId: null,
    branches: [],
    storageStatus: 'saved',
    storageSizeBytes: null,
    lastSavedAt: null,
    saveStatus: 'saved',
    pwaStatus: 'unsupported',
    deferredPrompt: null,
    importDialogOpen: false,
    importFileName: null,
    importJson: null,
    importPreview: null,
    importError: null,
    importExecuting: false,
    notificationPermission: 'default',
    isLoading: false,
    error: null,
  });
}

async function resetDatabase(): Promise<void> {
  const db = container.resolve(AppDatabase);
  await db.repositories.clear();
  await db.branches.clear();
  await db.tasks.clear();
  await db.commits.clear();
}

describe('SettingsScreenStore', () => {
  beforeEach(async () => {
    await resetDatabase();
    await resetStore();
  });

  it('loads repositories and picks first non-archived as current', async () => {
    const createUseCase = container.resolve(CreateRepositoryUseCase);
    await createUseCase.execute({ name: 'Repo A' });
    const repoB = await createUseCase.execute({ name: 'Repo B' });

    const store = useSettingsScreenStore.getState();
    await store.load();

    const state = useSettingsScreenStore.getState();
    expect(state.repositories).toHaveLength(2);
    expect(state.currentRepositoryId).toBe(repoB.id);
  });

  it('switches scope', () => {
    const store = useSettingsScreenStore.getState();
    store.setScope('workspace');
    expect(useSettingsScreenStore.getState().scope).toBe('workspace');
  });

  it('refreshSaveStatus marks offline when navigator is offline', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      value: false,
      configurable: true,
    });
    const store = useSettingsScreenStore.getState();
    store.refreshSaveStatus();
    expect(useSettingsScreenStore.getState().saveStatus).toBe('offline');
    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      configurable: true,
    });
  });

  it('exports data and saves file', async () => {
    const store = useSettingsScreenStore.getState();
    const fileSaveService = container.resolve(WebFileSaveService);
    const saveSpy = vi
      .spyOn(fileSaveService, 'save')
      .mockImplementation(() => undefined);

    await store.exportData('json');
    expect(saveSpy).toHaveBeenCalled();
  });

  it('previews import file and reports invalid JSON', async () => {
    const file = new File(['not-json'], 'data.json', { type: 'application/json' });
    const store = useSettingsScreenStore.getState();
    await store.previewImportFile(file);

    const state = useSettingsScreenStore.getState();
    expect(state.importError).toBe('导入文件不是有效的 JSON');
    expect(state.importPreview).toBeNull();
  });

  it('previews import file with valid export data', async () => {
    const json = JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      repositories: [{ id: 'r1' }],
      branches: [{ id: 'b1' }, { id: 'b2' }],
      tasks: [{ id: 't1' }],
      commits: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }],
    });
    const file = new File([json], 'data.json', { type: 'application/json' });
    const store = useSettingsScreenStore.getState();
    await store.previewImportFile(file);

    const state = useSettingsScreenStore.getState();
    expect(state.importError).toBeNull();
    expect(state.importPreview).toEqual({
      repositories: 1,
      branches: 2,
      tasks: 1,
      commits: 3,
    });
  });

  it('updates current repository name', async () => {
    const createUseCase = container.resolve(CreateRepositoryUseCase);
    const repo = await createUseCase.execute({ name: 'Old Name' });
    const store = useSettingsScreenStore.getState();
    await store.load();

    await store.updateCurrentRepository({ name: 'New Name' });

    const state = useSettingsScreenStore.getState();
    expect(state.saveStatus).toBe('saved');
    const updated = state.repositories.find((r) => r.id === repo.id);
    expect(updated?.name).toBe('New Name');
  });

  it('archives current repository', async () => {
    const createUseCase = container.resolve(CreateRepositoryUseCase);
    const repo = await createUseCase.execute({ name: 'To Archive' });
    const store = useSettingsScreenStore.getState();
    await store.load();

    await store.archiveCurrentRepository();

    const state = useSettingsScreenStore.getState();
    const archived = state.repositories.find((r) => r.id === repo.id);
    expect(archived?.isArchived).toBe(true);
  });

  it('deletes current repository and clears selection', async () => {
    const createUseCase = container.resolve(CreateRepositoryUseCase);
    const repo = await createUseCase.execute({ name: 'To Delete' });
    const store = useSettingsScreenStore.getState();
    await store.load();

    await store.deleteCurrentRepository();

    const state = useSettingsScreenStore.getState();
    expect(state.currentRepositoryId).toBeNull();
    expect(state.repositories.some((r) => r.id === repo.id)).toBe(false);
  });
});
