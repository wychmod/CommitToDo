import { addDays, startOfDay } from 'date-fns';
import { beforeEach, describe, expect, it } from 'vitest';

import { AppDatabase } from '@/data/db/app-database';
import { container } from '@/core/di/injection-container';
import { CreateRepositoryUseCase } from '@/application/usecases/repository/create-repository-usecase';
import { Priority, TaskStatus } from '@/domain/entities/enums';
import { Task } from '@/domain/entities/task';
import { Branch } from '@/domain/entities/branch';
import { Repository } from '@/domain/entities/repository';
import {
  getFilteredTasks,
  getProgress,
  getRecentRepositories,
  getTaskGroups,
  getWeekHeatmap,
  useTodayWorkspaceStore,
} from './today-workspace-store';

async function resetDatabase(): Promise<void> {
  const db = container.resolve(AppDatabase);
  await db.repositories.clear();
  await db.branches.clear();
  await db.tasks.clear();
  await db.commits.clear();
}

describe('TodayWorkspaceStore', () => {
  beforeEach(async () => {
    await resetDatabase();
    useTodayWorkspaceStore.setState({
      repositories: [],
      branches: [],
      tasks: [],
      commits: [],
      isLoading: false,
      error: null,
      filter: 'all',
      priorityFilter: null,
      showCompleted: true,
      selectedTaskId: null,
      isTaskFormOpen: false,
      isCreateRepoOpen: false,
      taskFormDefaults: null,
    });
  });

  it('loads and seeds demo data when the database is empty', async () => {
    const store = useTodayWorkspaceStore.getState();
    await store.load();

    const state = useTodayWorkspaceStore.getState();
    expect(state.repositories).toHaveLength(3);
    expect(state.repositories.map((r) => r.name).sort()).toEqual([
      'CommitToDo',
      '运动计划',
      '阅读清单',
    ]);
    expect(state.tasks.length).toBeGreaterThanOrEqual(5);
    expect(state.tasks.some((t) => t.title === '完成晨跑 5 km')).toBe(true);
    expect(state.tasks.some((t) => t.title === '整理功能页面清单')).toBe(true);
  });

  it('loads existing repositories without overwriting them', async () => {
    const createRepo = container.resolve(CreateRepositoryUseCase);
    await createRepo.execute({ name: 'Existing Repo' });

    const store = useTodayWorkspaceStore.getState();
    await store.load();

    const state = useTodayWorkspaceStore.getState();
    expect(state.repositories).toHaveLength(1);
    expect(state.repositories[0].name).toBe('Existing Repo');
    expect(state.tasks).toHaveLength(0);
  });

  it('creates a repository with a custom default branch', async () => {
    const store = useTodayWorkspaceStore.getState();
    const created = await store.createRepository({
      name: 'My Project',
      color: '#80e48c',
      defaultBranch: 'develop',
    });

    expect(created).not.toBeNull();
    const state = useTodayWorkspaceStore.getState();
    expect(state.repositories).toHaveLength(1);
    expect(state.branches.map((b) => b.name).sort()).toEqual(['develop', 'main']);
  });

  it('creates a task and refreshes the list', async () => {
    const store = useTodayWorkspaceStore.getState();
    const repo = await store.createRepository({ name: 'Test Repo', color: '#80e48c' });
    expect(repo).not.toBeNull();

    const branch = useTodayWorkspaceStore.getState().branches.find((b) => b.isMain)!;
    const created = await store.createTask({
      branchId: branch.id,
      title: 'New Task',
      priority: Priority.high,
      dueDate: new Date(),
    });

    expect(created).not.toBeNull();
    expect(useTodayWorkspaceStore.getState().tasks).toHaveLength(1);
    expect(useTodayWorkspaceStore.getState().tasks[0].title).toBe('New Task');
  });

  it('toggles a task between completed and todo', async () => {
    const store = useTodayWorkspaceStore.getState();
    await store.createRepository({ name: 'Test Repo', color: '#80e48c' });
    const branch = useTodayWorkspaceStore.getState().branches.find((b) => b.isMain)!;
    const created = await store.createTask({ branchId: branch.id, title: 'Toggle Me' });
    expect(created).not.toBeNull();

    await store.toggleCompleteTask(created!.id);
    let task = useTodayWorkspaceStore.getState().tasks.find((t) => t.id === created!.id)!;
    expect(task.status).toBe(TaskStatus.done);

    await store.toggleCompleteTask(created!.id);
    task = useTodayWorkspaceStore.getState().tasks.find((t) => t.id === created!.id)!;
    expect(task.status).toBe(TaskStatus.todo);
  });

  it('exports diagnostics as JSON', async () => {
    const store = useTodayWorkspaceStore.getState();
    await store.createRepository({ name: 'Export Repo', color: '#80e48c' });

    const json = await store.exportDiagnostics();
    const data = JSON.parse(json);
    expect(data.version).toBe(1);
    expect(data.repositories).toHaveLength(1);
  });
});

describe('today workspace selectors', () => {
  const repoA = new Repository({
    id: 'repo-a',
    name: 'A',
    icon: 'repo',
    color: '#80e48c',
    description: null,
    defaultBranchId: null,
    isArchived: false,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const repoB = new Repository({
    id: 'repo-b',
    name: 'B',
    icon: 'repo',
    color: '#59cbd0',
    description: null,
    defaultBranchId: null,
    isArchived: false,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: addDays(new Date(), -1),
  });

  const branchA = Branch.create(repoA.id, 'main', { isMain: true, color: repoA.color });
  const branchB = Branch.create(repoB.id, 'launch', { color: repoB.color });

  const today = startOfDay(new Date());
  const yesterday = addDays(today, -1);

  const tasks = [
    new Task({
      id: 't1',
      branchId: branchA.id,
      title: 'Done today',
      description: null,
      status: TaskStatus.done,
      priority: Priority.medium,
      dueDate: today,
      completedAt: today,
      parentTaskId: null,
      sortOrder: 0,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    new Task({
      id: 't2',
      branchId: branchA.id,
      title: 'Overdue high',
      description: null,
      status: TaskStatus.todo,
      priority: Priority.high,
      dueDate: yesterday,
      completedAt: null,
      parentTaskId: null,
      sortOrder: 1,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    new Task({
      id: 't3',
      branchId: branchB.id,
      title: 'Later low',
      description: null,
      status: TaskStatus.todo,
      priority: Priority.low,
      dueDate: addDays(today, 2),
      completedAt: null,
      parentTaskId: null,
      sortOrder: 0,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  ];

  it('computes progress', () => {
    const progress = getProgress(tasks);
    expect(progress.total).toBe(3);
    expect(progress.done).toBe(1);
    expect(progress.overdue).toBe(1);
    expect(progress.estimateMinutes).toBe(75);
  });

  it('filters overdue tasks', () => {
    const filtered = getFilteredTasks(tasks, 'overdue', null, true);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe('Overdue high');
  });

  it('filters by priority', () => {
    const filtered = getFilteredTasks(tasks, 'all', Priority.high, true);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe('Overdue high');
  });

  it('groups tasks by repository and branch', () => {
    const groups = getTaskGroups(tasks, [repoA, repoB], [branchA, branchB]);
    expect(groups).toHaveLength(2);
    expect(groups[0].tasks).toHaveLength(2);
    expect(groups[1].tasks).toHaveLength(1);
  });

  it('builds a 35-day heatmap', () => {
    const heatmap = getWeekHeatmap(tasks);
    expect(heatmap).toHaveLength(35);
    expect(heatmap[34].date.getTime()).toBe(today.getTime());
    expect(heatmap[34].count).toBe(1);
    expect(heatmap[34].level).toBeGreaterThan(0);
  });

  it('lists recent repositories with metadata', () => {
    const recent = getRecentRepositories([repoA, repoB], [branchA, branchB], tasks);
    expect(recent).toHaveLength(2);
    expect(recent[0].repository.id).toBe('repo-a');
    expect(recent[0].taskCount).toBe(2);
    expect(recent[1].taskCount).toBe(1);
  });
});
