import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { Branch } from '@/domain/entities/branch';
import { Commit } from '@/domain/entities/commit';
import { CommitType, Priority, TaskStatus } from '@/domain/entities/enums';
import { Repository } from '@/domain/entities/repository';
import { Task } from '@/domain/entities/task';

const repo = new Repository({
  id: 'repo-1',
  name: '运动计划',
  description: '把 5km 训练拆成可以持续推进的分支',
  defaultBranchId: 'branch-main',
  icon: 'repo',
  color: '#80e48c',
  isArchived: false,
  isDeleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const main = new Branch({
  id: 'branch-main',
  repositoryId: repo.id,
  name: 'main',
  parentBranchId: null,
  isMain: true,
  color: '#80e48c',
  isDeleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const launch = new Branch({
  id: 'branch-launch',
  repositoryId: repo.id,
  name: 'launch',
  parentBranchId: main.id,
  isMain: false,
  color: '#59cbd0',
  isDeleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const design = new Branch({
  id: 'branch-design',
  repositoryId: repo.id,
  name: 'design',
  parentBranchId: main.id,
  isMain: false,
  color: '#6e95ff',
  isDeleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const branches = [main, launch, design];

const tasks: Task[] = [
  new Task({
    id: 'task-1',
    branchId: main.id,
    title: '完成晨跑 5 km',
    description: null,
    status: TaskStatus.done,
    priority: Priority.high,
    dueDate: null,
    completedAt: new Date(),
    parentTaskId: null,
    sortOrder: 0,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  new Task({
    id: 'task-2',
    branchId: main.id,
    title: '整理下周训练任务',
    description: null,
    status: TaskStatus.inProgress,
    priority: Priority.medium,
    dueDate: null,
    completedAt: null,
    parentTaskId: null,
    sortOrder: 1,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  new Task({
    id: 'task-3',
    branchId: launch.id,
    title: '确认首页视觉方向',
    description: null,
    status: TaskStatus.inProgress,
    priority: Priority.high,
    dueDate: null,
    completedAt: null,
    parentTaskId: null,
    sortOrder: 0,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
];

const commits: Commit[] = [
  Commit.create('task-1', main.id, '完成晨跑统计卡片', CommitType.complete),
];

const mockStore = {
  repository: repo,
  branches,
  activeBranchId: main.id,
  allTasks: tasks,
  commits,
  isLoading: false,
  error: null,
  load: vi.fn(),
  switchBranch: vi.fn(),
  createBranch: vi.fn(),
  createTask: vi.fn(),
  completeTask: vi.fn(),
  clearError: vi.fn(),
};

vi.mock('@/presentation/stores/repository-overview-store', () => ({
  useRepositoryOverviewStore: () => mockStore,
}));

import { RepositoryOverviewScreen } from './repository-overview-screen';

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/repository/repo-1']}>
      <Routes>
        <Route
          path="/repository/:id"
          element={<RepositoryOverviewScreen />}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('RepositoryOverviewScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.activeBranchId = main.id;
  });

  it('renders repository title, description and activity', () => {
    renderScreen();

    expect(screen.getByRole('heading', { name: '运动计划' })).toBeInTheDocument();
    expect(
      screen.getByText('把 5km 训练拆成可以持续推进的分支')
    ).toBeInTheDocument();
    expect(screen.getAllByText(/最近活动 ·/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('LOCAL REPOSITORY')).toBeInTheDocument();
  });

  it('renders branch summary cards', () => {
    renderScreen();

    const summaryPanel = screen.getByRole('heading', { name: '分支概况' }).parentElement!;
    expect(within(summaryPanel).getByText('main')).toBeInTheDocument();
    expect(within(summaryPanel).getByText('launch')).toBeInTheDocument();
    expect(within(summaryPanel).getByText('design')).toBeInTheDocument();
  });

  it('switches active branch when a branch card is clicked', async () => {
    const user = userEvent.setup();
    renderScreen();

    const summaryPanel = screen.getByRole('heading', { name: '分支概况' }).parentElement!;
    const launchCard = within(summaryPanel).getByRole('button', {
      name: /launch/,
    });
    await user.click(launchCard);

    expect(mockStore.switchBranch).toHaveBeenCalledWith(launch.id);
  });

  it('opens new branch dialog', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('button', { name: '新建分支' }));

    expect(screen.getByRole('dialog', { name: '新建分支' })).toBeInTheDocument();
  });

  it('opens new task panel', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('button', { name: '新建任务' }));

    expect(screen.getByLabelText('任务标题')).toBeInTheDocument();
  });

  it('navigates to all tasks link', () => {
    renderScreen();

    const link = screen.getByRole('link', { name: '查看全部任务' });
    expect(link).toHaveAttribute('href', '/repository/repo-1/tasks?branch=branch-main');
  });

  it('navigates to all commits link', () => {
    renderScreen();

    const link = screen.getByRole('link', { name: '查看全部提交' });
    expect(link).toHaveAttribute(
      'href',
      '/insights?repository=repo-1&tab=activity'
    );
  });

  it('navigates to full insights link', () => {
    renderScreen();

    const link = screen.getByRole('link', { name: '查看完整洞察' });
    expect(link).toHaveAttribute(
      'href',
      '/insights?repository=repo-1&tab=heatmap'
    );
  });

  it('renders empty state when no commits', () => {
    mockStore.commits = [];
    renderScreen();

    expect(screen.getByText('还没有提交')).toBeInTheDocument();
    mockStore.commits = commits;
  });

  it('renders empty state when no branches', () => {
    mockStore.branches = [];
    mockStore.allTasks = [];
    renderScreen();

    expect(screen.getByText('还没有分支')).toBeInTheDocument();
    mockStore.branches = branches;
    mockStore.allTasks = tasks;
  });
});
