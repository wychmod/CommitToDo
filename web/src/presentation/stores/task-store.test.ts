import { describe, expect, it, beforeEach } from 'vitest';
import { AppDatabase } from '../../data/db/app-database';
import { container } from '../../core/di/injection-container';
import { CreateRepositoryUseCase } from '../../application/usecases/repository/create-repository-usecase';
import { CreateTaskUseCase } from '../../application/usecases/task/create-task-usecase';
import { useTaskStore } from './task-store';

async function resetDatabase(): Promise<void> {
  const db = container.resolve(AppDatabase);
  await db.repositories.clear();
  await db.branches.clear();
  await db.tasks.clear();
  await db.commits.clear();
}

describe('TaskStore', () => {
  beforeEach(async () => {
    await resetDatabase();
    useTaskStore.setState({
      task: null,
      commits: [],
      isLoading: false,
      error: null,
    });
  });

  it('loads task detail and commits', async () => {
    const createRepo = container.resolve(CreateRepositoryUseCase);
    const repo = await createRepo.execute({ name: 'Project' });
    const db = container.resolve(AppDatabase);
    const branches = await db.branches.where({ repositoryId: repo.id }).toArray();
    const mainBranch = branches.find((b) => b.isMain);
    expect(mainBranch).toBeDefined();

    const createTask = container.resolve(CreateTaskUseCase);
    const task = await createTask.execute({ branchId: mainBranch!.id, title: 'Task 1' });

    const store = useTaskStore.getState();
    await store.load(task.id);

    const state = useTaskStore.getState();
    expect(state.task?.title).toBe('Task 1');
    expect(state.commits).toHaveLength(1);
  });

  it('completes a task', async () => {
    const createRepo = container.resolve(CreateRepositoryUseCase);
    const repo = await createRepo.execute({ name: 'Project' });
    const db = container.resolve(AppDatabase);
    const branches = await db.branches.where({ repositoryId: repo.id }).toArray();
    const mainBranch = branches.find((b) => b.isMain)!;

    const createTask = container.resolve(CreateTaskUseCase);
    const task = await createTask.execute({ branchId: mainBranch.id, title: 'Task 2' });

    const store = useTaskStore.getState();
    await store.load(task.id);
    await store.completeTask();

    expect(useTaskStore.getState().task?.status).toBe(2);
    expect(useTaskStore.getState().commits).toHaveLength(2);
  });
});
