import { describe, expect, it, beforeEach } from 'vitest';
import { AppDatabase } from '../../../data/db/app-database';
import { DexieRepositoryRepository } from '../../../data/repositories/dexie-repository-repository';
import { DexieBranchRepository } from '../../../data/repositories/dexie-branch-repository';
import { CreateRepositoryUseCase } from './create-repository-usecase';
import { DeleteRepositoryUseCase } from './delete-repository-usecase';
import { DexieTaskRepository } from '../../../data/repositories/dexie-task-repository';

describe('Repository use cases', () => {
  let db: AppDatabase;

  beforeEach(async () => {
    db = new AppDatabase();
    await db.delete();
    await db.open();
  });

  it('CreateRepositoryUseCase creates repo and main branch', async () => {
    const repoRepo = new DexieRepositoryRepository(db);
    const branchRepo = new DexieBranchRepository(db);
    const useCase = new CreateRepositoryUseCase(repoRepo, branchRepo);

    const repo = await useCase.execute({ name: 'New Project' });
    expect(repo.name).toBe('New Project');

    const branches = await branchRepo.getByRepositoryId(repo.id);
    expect(branches).toHaveLength(1);
    expect(branches[0].isMain).toBe(true);
    expect(branches[0].name).toBe('main');
  });

  it('DeleteRepositoryUseCase deletes repo and related data', async () => {
    const repoRepo = new DexieRepositoryRepository(db);
    const branchRepo = new DexieBranchRepository(db);
    const taskRepo = new DexieTaskRepository(db);
    const createUseCase = new CreateRepositoryUseCase(repoRepo, branchRepo);
    const deleteUseCase = new DeleteRepositoryUseCase(repoRepo, branchRepo, taskRepo);

    const repo = await createUseCase.execute({ name: 'Temp' });
    await deleteUseCase.execute(repo.id);

    const fetched = await repoRepo.getById(repo.id);
    expect(fetched).toBeNull();
  });
});
