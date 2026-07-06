import { describe, expect, it, beforeEach } from 'vitest';
import { AppDatabase } from '../../data/db/app-database';
import { container } from '../../core/di/injection-container';
import { ImportDataUseCase } from './import-data-usecase';
import { IRepositoryRepository } from '../../domain/repositories/i-repository-repository';

async function resetDatabase(): Promise<void> {
  const db = container.resolve(AppDatabase);
  await db.repositories.clear();
  await db.branches.clear();
  await db.tasks.clear();
  await db.commits.clear();
}

function createExportJson(): string {
  return JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    repositories: [
      {
        id: 'repo-1',
        name: 'Imported Repo',
        icon: 'repository',
        color: '#3B82F6',
        isArchived: false,
        isDeleted: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    branches: [
      {
        id: 'branch-1',
        repositoryId: 'repo-1',
        name: 'main',
        parentBranchId: null,
        isMain: true,
        color: '#3B82F6',
        isDeleted: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    tasks: [
      {
        id: 'task-1',
        branchId: 'branch-1',
        title: 'Imported Task',
        description: null,
        status: 0,
        priority: 1,
        dueDate: null,
        completedAt: null,
        parentTaskId: null,
        sortOrder: 0,
        isDeleted: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    commits: [
      {
        id: 'commit-1',
        taskId: 'task-1',
        branchId: 'branch-1',
        message: '创建任务 Imported Task',
        type: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  });
}

describe('ImportDataUseCase', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('imports data in merge mode', async () => {
    const useCase = container.resolve(ImportDataUseCase);
    const result = await useCase.execute(createExportJson(), 'merge');

    expect(result.repositories).toBe(1);
    expect(result.branches).toBe(1);
    expect(result.tasks).toBe(1);
    expect(result.commits).toBe(1);

    const repoRepo = container.resolve<IRepositoryRepository>('IRepositoryRepository');
    const repos = await repoRepo.getAll();
    expect(repos).toHaveLength(1);
    expect(repos[0].name).toBe('Imported Repo');
  });

  it('rejects unsupported version', async () => {
    const useCase = container.resolve(ImportDataUseCase);
    const json = JSON.stringify({ version: 2 });
    await expect(useCase.execute(json)).rejects.toThrow('不支持的导出版本');
  });

  it('overwrites existing data', async () => {
    const useCase = container.resolve(ImportDataUseCase);
    await useCase.execute(createExportJson(), 'merge');

    const overwriteJson = JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      repositories: [
        {
          id: 'repo-2',
          name: 'Overwrite Repo',
          icon: 'repository',
          color: '#EF4444',
          isArchived: false,
          isDeleted: false,
          createdAt: '2026-02-01T00:00:00.000Z',
          updatedAt: '2026-02-01T00:00:00.000Z',
        },
      ],
      branches: [],
      tasks: [],
      commits: [],
    });

    await useCase.execute(overwriteJson, 'overwrite');
    const repoRepo = container.resolve<IRepositoryRepository>('IRepositoryRepository');
    const repos = await repoRepo.getAll();
    expect(repos).toHaveLength(1);
    expect(repos[0].name).toBe('Overwrite Repo');
  });
});
