import '@/core/theme/v3-tokens.css';

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppDatabase } from '@/data/db/app-database';
import { container } from '@/core/di/injection-container';
import { Priority, TaskStatus } from '@/domain/entities/enums';
import { CreateBranchUseCase } from '@/application/usecases/branch/create-branch-usecase';
import { CreateRepositoryUseCase } from '@/application/usecases/repository/create-repository-usecase';
import { CreateTaskUseCase } from '@/application/usecases/task/create-task-usecase';
import { UpdateTaskUseCase } from '@/application/usecases/task/update-task-usecase';
import { useRepositoryStore } from '@/presentation/stores/repository-store';
import { useTaskStore } from '@/presentation/stores/task-store';
import type { Repository } from '@/domain/entities/repository';

import { RepositoryTasksScreen } from './repository-tasks-screen';

const openPaletteMock = vi.fn();

vi.mock('@/presentation/components/command-palette/command-palette', () => ({
  CommandPalette: (): JSX.Element => (
    <div data-testid="command-palette">Command Palette</div>
  ),
}));

vi.mock('@/presentation/components/command-palette/command-palette.store', () => ({
  useCommandPaletteStore: (
    selector: (state: { open: boolean; openPalette: () => void }) => unknown,
  ) =>
    selector({
      open: false,
      openPalette: openPaletteMock,
    }),
}));

vi.mock('@/presentation/stores/home-store', () => ({
  useHomeStore: (
    selector: (state: { repositories: Repository[]; load: () => void }) => unknown,
  ) => selector(homeStoreState),
}));

vi.mock('@/presentation/stores/settings-store', () => ({
  useSettingsStore: (
    selector: (state: { isDarkMode: boolean; setDarkMode: (v: boolean) => void }) => unknown,
  ) =>
    selector({
      isDarkMode: true,
      setDarkMode: vi.fn(),
    }),
}));

let homeStoreState: {
  repositories: Repository[];
  load: () => void;
} = {
  repositories: [],
  load: vi.fn(),
};

async function resetDatabase(): Promise<void> {
  const db = container.resolve(AppDatabase);
  await db.repositories.clear();
  await db.branches.clear();
  await db.tasks.clear();
  await db.commits.clear();
}

async function flushAsync(): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, 50);
  });
}

async function createDemoData(): Promise<{
  repositoryId: string;
  mainBranchId: string;
  launchBranchId: string;
  designBranchId: string;
}> {
  const createRepo = container.resolve(CreateRepositoryUseCase);
  const createBranch = container.resolve(CreateBranchUseCase);
  const createTask = container.resolve(CreateTaskUseCase);
  const updateTask = container.resolve(UpdateTaskUseCase);

  const repo = await createRepo.execute({ name: '运动计划', color: '#3B82F6' });
  const branches = await container
    .resolve<import('@/domain/repositories/i-branch-repository').IBranchRepository>('IBranchRepository')
    .getByRepositoryId(repo.id);
  const mainBranch = branches.find((b) => b.isMain);
  if (!mainBranch) throw new Error('main branch missing');

  const launch = await createBranch.execute({
    repositoryId: repo.id,
    name: 'launch',
    parentBranchId: mainBranch.id,
    color: '#59cbd0',
  });
  const design = await createBranch.execute({
    repositoryId: repo.id,
    name: 'design',
    parentBranchId: mainBranch.id,
    color: '#6e95ff',
  });

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const task1 = await createTask.execute({
    branchId: mainBranch.id,
    title: '整理下周训练任务',
    description: '规划预期 5 km 周期',
    priority: Priority.medium,
    dueDate: today,
  });
  const task2 = await createTask.execute({
    branchId: mainBranch.id,
    title: '完成晨跑 5 km',
    description: '07:12 完成 · 28 分钟',
    priority: Priority.medium,
    dueDate: today,
  });
  await createTask.execute({
    branchId: mainBranch.id,
    title: '补充跑后拉伸计划',
    description: '恢复训练',
    priority: Priority.low,
    dueDate: tomorrow,
  });
  await createTask.execute({
    branchId: mainBranch.id,
    title: '准备周末长跑',
    description: '补给与路线规划',
    priority: Priority.high,
    dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3),
  });
  await createTask.execute({
    branchId: launch.id,
    title: 'launch 任务 A',
    priority: Priority.medium,
    dueDate: null,
  });
  await createTask.execute({
    branchId: design.id,
    title: 'design 任务 A',
    priority: Priority.low,
    dueDate: null,
  });

  await updateTask.execute({ id: task1.id, status: TaskStatus.inProgress });
  await updateTask.execute({ id: task2.id, status: TaskStatus.done });

  return {
    repositoryId: repo.id,
    mainBranchId: mainBranch.id,
    launchBranchId: launch.id,
    designBranchId: design.id,
  };
}

function renderScreen(repositoryId: string): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[`/repository/${repositoryId}/tasks`]}>
      <Routes>
        <Route
          path="/repository/:id/tasks"
          element={<RepositoryTasksScreen />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

function getTabByName(name: RegExp): HTMLElement {
  const tabs = screen.getAllByRole('tab');
  const tab = tabs.find((t) => name.test(t.textContent ?? ''));
  if (!tab) throw new Error(`Tab matching ${name} not found`);
  return tab;
}

function getRowByName(name: RegExp): HTMLElement {
  return screen.getByRole('row', { name });
}

async function waitForRow(name: RegExp): Promise<HTMLElement> {
  return screen.findByRole('row', { name });
}

describe('RepositoryTasksScreen', () => {
  beforeEach(async () => {
    await resetDatabase();
    useRepositoryStore.setState({
      repository: null,
      branches: [],
      tasks: [],
      allRepositoryTasks: [],
      activeBranchId: null,
      selectedTaskId: null,
      isLoading: false,
      error: null,
    });
    useTaskStore.setState({
      task: null,
      commits: [],
      isLoading: false,
      error: null,
    });
    openPaletteMock.mockClear();
    homeStoreState = { repositories: [], load: vi.fn() };
    await flushAsync();
  });

  it('renders title, branch tabs, filter sidebar, table and detail panel', async () => {
    const { repositoryId } = await createDemoData();
    renderScreen(repositoryId);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '任务' })).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });
    expect(getTabByName(/main/i)).toBeInTheDocument();
    expect(getTabByName(/launch/i)).toBeInTheDocument();
    expect(getTabByName(/design/i)).toBeInTheDocument();
    expect(screen.getByLabelText('任务筛选')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: '任务列表' })).toBeInTheDocument();
    expect(screen.getByText('任务详情')).toBeInTheDocument();
  });

  it('selects "完成晨跑 5 km" by default and shows its detail', async () => {
    const { repositoryId } = await createDemoData();
    renderScreen(repositoryId);

    const row = await waitForRow(/完成晨跑 5 km/i);
    expect(row).toHaveAttribute('aria-selected', 'true');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '完成晨跑 5 km' })).toBeInTheDocument();
    });
  });

  it('switches task list when a branch tab is clicked', async () => {
    const user = userEvent.setup();
    const { repositoryId } = await createDemoData();
    renderScreen(repositoryId);

    await waitForRow(/完成晨跑 5 km/i);

    await user.click(getTabByName(/launch/i));

    await waitFor(() => {
      expect(getRowByName(/launch 任务 A/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('row', { name: /完成晨跑 5 km/i })).not.toBeInTheDocument();
  });

  it('filters tasks by search query', async () => {
    const user = userEvent.setup();
    const { repositoryId } = await createDemoData();
    renderScreen(repositoryId);

    await waitForRow(/完成晨跑 5 km/i);

    const searchInput = screen.getByPlaceholderText('搜索当前分支任务…');
    await user.type(searchInput, '晨跑');

    await waitFor(() => {
      expect(screen.getAllByRole('row').length).toBeGreaterThanOrEqual(1);
    });
    expect(getRowByName(/完成晨跑 5 km/i)).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /准备周末长跑/i })).not.toBeInTheDocument();
  });

  it('filters tasks by status', async () => {
    const user = userEvent.setup();
    const { repositoryId } = await createDemoData();
    renderScreen(repositoryId);

    await waitForRow(/完成晨跑 5 km/i);

    const sidebar = screen.getByLabelText('任务筛选');
    const statusButton = within(sidebar).getByRole('button', { name: /^已完成/ });
    await user.click(statusButton);

    await waitFor(() => {
      expect(getRowByName(/完成晨跑 5 km/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('row', { name: /整理下周训练任务/i })).not.toBeInTheDocument();
  });

  it('filters tasks by priority in the sidebar', async () => {
    const user = userEvent.setup();
    const { repositoryId } = await createDemoData();
    renderScreen(repositoryId);

    await waitForRow(/完成晨跑 5 km/i);

    const sidebar = screen.getByLabelText('任务筛选');
    const priorityCheckbox = within(sidebar).getByLabelText('高');
    await user.click(priorityCheckbox);

    await waitFor(() => {
      expect(getRowByName(/准备周末长跑/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('row', { name: /完成晨跑 5 km/i })).not.toBeInTheDocument();
  });

  it('filters tasks by priority via the toolbar popover', async () => {
    const user = userEvent.setup();
    const { repositoryId } = await createDemoData();
    renderScreen(repositoryId);

    await waitForRow(/完成晨跑 5 km/i);

    await user.click(screen.getByRole('button', { name: '优先级筛选' }));

    const dialog = await screen.findByRole('dialog', { name: '优先级选项' });
    const highOption = within(dialog).getByText('高');
    await user.click(highOption);

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(getRowByName(/准备周末长跑/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('row', { name: /完成晨跑 5 km/i })).not.toBeInTheDocument();

    // Sidebar checkbox should reflect the same state.
    const sidebar = screen.getByLabelText('任务筛选');
    expect(within(sidebar).getByLabelText('高')).toBeChecked();
  });

  it('does not render a native priority multiple select', async () => {
    const { repositoryId } = await createDemoData();
    renderScreen(repositoryId);

    await waitForRow(/完成晨跑 5 km/i);

    expect(document.querySelector('select[multiple]')).not.toBeInTheDocument();
  });

  it('updates the detail panel when a task row is clicked', async () => {
    const user = userEvent.setup();
    const { repositoryId } = await createDemoData();
    renderScreen(repositoryId);

    await waitForRow(/完成晨跑 5 km/i);

    const row = getRowByName(/整理下周训练任务/i);
    await user.click(row);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '整理下周训练任务' })).toBeInTheDocument();
    });
  });

  it('opens the new task form panel', async () => {
    const user = userEvent.setup();
    const { repositoryId } = await createDemoData();
    renderScreen(repositoryId);

    await waitForRow(/完成晨跑 5 km/i);

    const buttons = screen.getAllByRole('button', { name: /新建任务/i });
    await user.click(buttons[0]!);

    expect(screen.getAllByText('新建任务').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByPlaceholderText('任务标题')).toBeInTheDocument();
  });

  it('opens the edit task form with the selected task', async () => {
    const user = userEvent.setup();
    const { repositoryId } = await createDemoData();
    renderScreen(repositoryId);

    await waitForRow(/完成晨跑 5 km/i);

    const row = getRowByName(/整理下周训练任务/i);
    await user.click(row);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '整理下周训练任务' })).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button', { name: /编辑任务/i });
    await user.click(editButtons[0]!);

    await waitFor(() => {
      expect(screen.getByDisplayValue('整理下周训练任务')).toBeInTheDocument();
    });
  });

  it('completes a task and creates a commit', async () => {
    const user = userEvent.setup();
    const { repositoryId } = await createDemoData();
    renderScreen(repositoryId);

    const row = await waitForRow(/准备周末长跑/i);
    await user.click(row);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '准备周末长跑' })).toBeInTheDocument();
    });

    const completeButtons = screen.getAllByRole('button', { name: /完成并提交/i });
    await user.click(completeButtons[0]!);

    const titleInput = screen.getByPlaceholderText('提交标题');
    await user.clear(titleInput);
    await user.type(titleInput, 'feat: 完成周末准备');

    const submitButtons = screen.getAllByRole('button', { name: /^完成并提交$/ });
    await user.click(submitButtons[0]!);

    await waitFor(() => {
      expect(getRowByName(/准备周末长跑/i)).toHaveAttribute('aria-selected', 'true');
    });

    expect(screen.getAllByText('已完成').length).toBeGreaterThanOrEqual(1);
    await waitFor(() => {
      expect(screen.getByText(/feat: 完成周末准备/)).toBeInTheDocument();
    });
  });

  it('restores a completed task back to todo', async () => {
    const user = userEvent.setup();
    const { repositoryId } = await createDemoData();
    renderScreen(repositoryId);

    const row = await waitForRow(/完成晨跑 5 km/i);
    await user.click(row);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '完成晨跑 5 km' })).toBeInTheDocument();
    });

    const restoreButtons = screen.getAllByRole('button', { name: /恢复任务/i });
    await user.click(restoreButtons[0]!);

    await waitFor(() => {
      expect(screen.getAllByText('待办').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('deletes a task after confirmation', async () => {
    const user = userEvent.setup();
    const { repositoryId } = await createDemoData();
    renderScreen(repositoryId);

    const row = await waitForRow(/完成晨跑 5 km/i);
    await user.click(row);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '完成晨跑 5 km' })).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /删除/i });
    await user.click(deleteButtons[0]!);

    await waitFor(() => {
      const confirmButtons = screen.getAllByRole('button', { name: /^删除$/ });
      expect(confirmButtons.length).toBeGreaterThanOrEqual(1);
    });
    const confirmButtons = screen.getAllByRole('button', { name: /^删除$/ });
    await user.click(confirmButtons[confirmButtons.length - 1]!);

    await waitFor(() => {
      expect(screen.queryByRole('row', { name: /完成晨跑 5 km/i })).not.toBeInTheDocument();
    });
  });

  it('shows empty state when branch has no tasks', async () => {
    const user = userEvent.setup();
    const { repositoryId, launchBranchId } = await createDemoData();
    const branchRepo = container.resolve<import('@/domain/repositories/i-branch-repository').IBranchRepository>('IBranchRepository');
    const launch = await branchRepo.getById(launchBranchId);
    if (!launch) throw new Error('launch missing');

    const taskRepo = container.resolve<import('@/domain/repositories/i-task-repository').ITaskRepository>('ITaskRepository');
    const tasks = await taskRepo.getByBranchId(launchBranchId);
    for (const task of tasks) {
      await taskRepo.delete(task.id);
    }

    renderScreen(repositoryId);

    await user.click(await waitFor(() => getTabByName(/launch/i)));

    await waitFor(() => {
      expect(screen.getByText(/launch 还没有任务/)).toBeInTheDocument();
    });
  });

  it('shows empty state when filters return no results', async () => {
    const user = userEvent.setup();
    const { repositoryId } = await createDemoData();
    renderScreen(repositoryId);

    await waitForRow(/完成晨跑 5 km/i);

    const searchInput = screen.getByPlaceholderText('搜索当前分支任务…');
    await user.type(searchInput, '不存在的任务');

    await waitFor(() => {
      expect(screen.getByText('没有匹配的任务')).toBeInTheDocument();
    });
  });

  it('shows empty detail placeholder when no task is selected', async () => {
    const user = userEvent.setup();
    const { repositoryId } = await createDemoData();
    renderScreen(repositoryId);

    await waitForRow(/完成晨跑 5 km/i);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '关闭任务详情' })).toBeInTheDocument();
    });
    const closeButton = screen.getByRole('button', { name: '关闭任务详情' });
    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.getByText('选择一个任务')).toBeInTheDocument();
    });
  });
});
