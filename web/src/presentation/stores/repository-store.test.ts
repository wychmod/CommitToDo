import { describe, expect, it, beforeEach } from 'vitest';
import { AppDatabase } from '../../data/db/app-database';
import { container } from '../../core/di/injection-container';
import { CreateRepositoryUseCase } from '../../application/usecases/repository/create-repository-usecase';
import { useRepositoryStore } from './repository-store';

async function resetDatabase(): Promise<void> {
  const db = container.resolve(AppDatabase);
  await db.repositories.clear();
  await db.branches.clear();
  await db.tasks.clear();
  await db.commits.clear();
}

describe('RepositoryStore', () => {
  beforeEach(async () => {
    await resetDatabase();
    useRepositoryStore.setState({
      repository: null,
      branches: [],
      tasks: [],
      activeBranchId: null,
      selectedTaskId: null,
      isLoading: false,
      error: null,
    });
  });

  it('loads repository with main branch', async () => {
    const createRepo = container.resolve(CreateRepositoryUseCase);
    const repo = await createRepo.execute({ name: 'Project' });

    const store = useRepositoryStore.getState();
    await store.loadData(repo.id);

    const state = useRepositoryStore.getState();
    expect(state.repository?.name).toBe('Project');
    expect(state.branches).toHaveLength(1);
    expect(state.branches[0].isMain).toBe(true);
    expect(state.activeBranchId).toBe(state.branches[0].id);
  });

  it('creates a task in active branch', async () => {
    const createRepo = container.resolve(CreateRepositoryUseCase);
    const repo = await createRepo.execute({ name: 'Project' });

    const store = useRepositoryStore.getState();
    await store.loadData(repo.id);
    const task = await store.createTask({ title: 'Implement feature' });

    expect(task).not.toBeNull();
    expect(useRepositoryStore.getState().tasks).toHaveLength(1);
    expect(useRepositoryStore.getState().tasks[0].title).toBe('Implement feature');
  });
});
