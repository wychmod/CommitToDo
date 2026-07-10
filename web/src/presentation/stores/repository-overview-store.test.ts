import { describe, expect, it, beforeEach } from 'vitest';
import { AppDatabase } from '@/data/db/app-database';
import { container } from '@/core/di/injection-container';
import { CreateRepositoryUseCase } from '@/application/usecases/repository/create-repository-usecase';
import { CreateTaskUseCase } from '@/application/usecases/task/create-task-usecase';
import { DexieRepositoryRepository } from '@/data/repositories/dexie-repository-repository';
import { DexieBranchRepository } from '@/data/repositories/dexie-branch-repository';
import { DexieTaskRepository } from '@/data/repositories/dexie-task-repository';
import { Branch } from '@/domain/entities/branch';
import { Task } from '@/domain/entities/task';
import { TaskStatus } from '@/domain/entities/enums';
import { useRepositoryOverviewStore } from './repository-overview-store';

async function resetDatabase(): Promise<void> {
  const db = container.resolve(AppDatabase);
  await db.repositories.clear();
  await db.branches.clear();
  await db.tasks.clear();
  await db.commits.clear();
}

async function seedRepository(name: string) {
  const db = container.resolve(AppDatabase);
  const repoRepo = new DexieRepositoryRepository(db);
  const branchRepo = new DexieBranchRepository(db);
  const createRepo = new CreateRepositoryUseCase(repoRepo, branchRepo);
  const repository = await createRepo.execute({ name });
  const branches = await branchRepo.getByRepositoryId(repository.id);
  return {
    repository,
    branches,
    branchRepo,
    taskRepo: new DexieTaskRepository(db),
  };
}

describe('RepositoryOverviewStore', () => {
  beforeEach(async () => {
    await resetDatabase();
    useRepositoryOverviewStore.setState({
      repository: null,
      branches: [],
      activeBranchId: null,
      allTasks: [],
      commits: [],
      isLoading: false,
      error: null,
    });
  });

  it('loads repository, branches, tasks and commits', async () => {
    const { repository, branches, taskRepo } = await seedRepository('运动计划');
    const main = branches.find((b) => b.isMain)!;
    await taskRepo.create(Task.create(main.id, 'Task 1'));

    const store = useRepositoryOverviewStore.getState();
    await store.load(repository.id);

    const state = useRepositoryOverviewStore.getState();
    expect(state.repository?.name).toBe('运动计划');
    expect(state.branches).toHaveLength(1);
    expect(state.activeBranchId).toBe(main.id);
    expect(state.allTasks).toHaveLength(1);
  });

  it('switches active branch', async () => {
    const { repository, branchRepo } = await seedRepository('运动计划');
    const feature = await branchRepo.create(
      Branch.create(repository.id, 'launch', { color: '#59CBD0' })
    );

    const store = useRepositoryOverviewStore.getState();
    await store.load(repository.id);
    store.switchBranch(feature.id);

    expect(useRepositoryOverviewStore.getState().activeBranchId).toBe(feature.id);
  });

  it('creates a branch and switches to it', async () => {
    const { repository } = await seedRepository('运动计划');

    const store = useRepositoryOverviewStore.getState();
    await store.load(repository.id);
    const branch = await store.createBranch('design', { color: '#6E95FF' });

    const state = useRepositoryOverviewStore.getState();
    expect(state.branches).toHaveLength(2);
    expect(state.activeBranchId).toBe(branch?.id);
  });

  it('creates a task in a branch and refreshes data', async () => {
    const { repository, branches } = await seedRepository('运动计划');
    const main = branches.find((b) => b.isMain)!;

    const store = useRepositoryOverviewStore.getState();
    await store.load(repository.id);
    const task = await store.createTask(main.id, { title: '新任务' });

    const state = useRepositoryOverviewStore.getState();
    expect(task).not.toBeNull();
    expect(state.allTasks).toHaveLength(1);
    expect(state.commits.length).toBeGreaterThan(0);
  });

  it('completes and uncompletes a task', async () => {
    const { repository, branches } = await seedRepository('运动计划');
    const main = branches.find((b) => b.isMain)!;
    const createTask = container.resolve(CreateTaskUseCase);
    const task = await createTask.execute({
      branchId: main.id,
      title: 'Toggle me',
    });

    const store = useRepositoryOverviewStore.getState();
    await store.load(repository.id);
    expect(useRepositoryOverviewStore.getState().allTasks[0].status).toBe(
      TaskStatus.todo
    );

    await store.completeTask(task.id);
    expect(useRepositoryOverviewStore.getState().allTasks[0].status).toBe(
      TaskStatus.done
    );

    await store.completeTask(task.id);
    expect(useRepositoryOverviewStore.getState().allTasks[0].status).toBe(
      TaskStatus.todo
    );
  });
});
