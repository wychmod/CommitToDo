import { describe, expect, it, beforeEach } from 'vitest';
import { AppDatabase } from '../../data/db/app-database';
import { container } from '../../core/di/injection-container';
import { CreateRepositoryUseCase } from '../../application/usecases/repository/create-repository-usecase';
import { CreateTaskUseCase } from '../../application/usecases/task/create-task-usecase';
import { useSearchStore } from './search-store';

async function resetDatabase(): Promise<void> {
  const db = container.resolve(AppDatabase);
  await db.repositories.clear();
  await db.branches.clear();
  await db.tasks.clear();
  await db.commits.clear();
}

describe('SearchStore', () => {
  beforeEach(async () => {
    await resetDatabase();
    useSearchStore.setState({
      query: '',
      tasks: [],
      branches: [],
      repositories: [],
      isLoading: false,
      error: null,
    });
  });

  it('searches repositories and tasks by name', async () => {
    const createRepo = container.resolve(CreateRepositoryUseCase);
    const repo = await createRepo.execute({ name: 'Alpha Project' });
    const branches = await container.resolve(AppDatabase).branches.where({ repositoryId: repo.id }).toArray();
    const mainBranch = branches.find((b) => b.isMain);
    expect(mainBranch).toBeDefined();

    const createTask = container.resolve(CreateTaskUseCase);
    await createTask.execute({ branchId: mainBranch!.id, title: 'Alpha task' });

    const store = useSearchStore.getState();
    await store.search('Alpha');

    const state = useSearchStore.getState();
    expect(state.repositories).toHaveLength(1);
    expect(state.tasks).toHaveLength(1);
  });
});
