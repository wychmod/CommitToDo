import '@/core/theme/v3-tokens.css';

import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppDatabase } from '@/data/db/app-database';
import { container } from '@/core/di/injection-container';
import { useTodayWorkspaceStore } from '@/presentation/stores/today-workspace-store';
import type { Repository } from '@/domain/entities/repository';

import { TodayWorkspaceScreen } from './today-workspace-screen';

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
    selector: (state: {
      isDarkMode: boolean;
      setDarkMode: (v: boolean) => void;
    }) => unknown,
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

function LocationLabel(): JSX.Element {
  const location = useLocation();
  return <span data-testid="current-path">{location.pathname + location.search}</span>;
}

function renderScreen(initialEntry = '/workspace'): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/workspace" element={<TodayWorkspaceScreen />} />
        <Route
          path="/repository/:id"
          element={<div><LocationLabel /><div data-testid="repo-page">Repo</div></div>}
        />
        <Route
          path="/insights"
          element={<div><LocationLabel /><div data-testid="insights-page">Insights</div></div>}
        />
      </Routes>
    </MemoryRouter>
  );
}

async function resetStore(): Promise<void> {
  act(() => {
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
}

describe('TodayWorkspaceScreen', () => {
  beforeEach(async () => {
    const db = container.resolve(AppDatabase);
    await db.repositories.clear();
    await db.branches.clear();
    await db.tasks.clear();
    await db.commits.clear();

    openPaletteMock.mockClear();
    homeStoreState = { repositories: [], load: vi.fn() };
    await resetStore();

    // Flush any lingering async store operations from the previous test so they
    // do not write into the freshly cleared database / reset state.
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
  });

  it('renders title, date, task groups and right cards', async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '今天' })).toBeInTheDocument();
    });
    expect(screen.getByText('TODAY')).toBeInTheDocument();
    expect(screen.getByText(/年/)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('今日焦点')).toBeInTheDocument();
    });
    expect(screen.getByText('今日节奏')).toBeInTheDocument();
    expect(screen.getByText('本周热力图')).toBeInTheDocument();
    expect(screen.getByText('最近仓库')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('运动计划').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByText('完成晨跑 5 km')).toBeInTheDocument();
  });

  it('opens the quick add task form', async () => {
    const user = userEvent.setup();
    renderScreen();

    const button = await waitFor(() =>
      screen.getAllByRole('button', { name: '快速添加任务' })[0]
    );
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '快速添加任务' })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: '保存任务' })).toBeInTheDocument();
  });

  it('opens the create repository dialog', async () => {
    const user = userEvent.setup();
    renderScreen();

    const button = await waitFor(() =>
      screen.getAllByRole('button', { name: '新建仓库' })[0]
    );
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '新建仓库' })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: '创建仓库' })).toBeInTheDocument();
  });

  it('navigates to a recent repository', async () => {
    const user = userEvent.setup();
    renderScreen();

    const recentCard = await waitFor(() => screen.getByLabelText('最近仓库'));
    const repoLink = await waitFor(() => within(recentCard).getByText('运动计划'));
    await user.click(repoLink);

    await waitFor(() => {
      expect(screen.getByTestId('current-path')).toHaveTextContent(/\/repository\//);
    });
  });

  it('opens task detail when a task row is clicked', async () => {
    const user = userEvent.setup();
    renderScreen();

    const taskRow = await waitFor(() => screen.getByText('整理下周训练任务'));
    await user.click(taskRow);

    await waitFor(() => {
      expect(screen.getByLabelText('任务详情')).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: '整理下周训练任务' })).toBeInTheDocument();
  });

  it('updates progress when a task is checked complete', async () => {
    const user = userEvent.setup();
    renderScreen();

    const progress = await waitFor(() => screen.getByText(/\d+ \/ \d+ 已完成/));
    const progressBefore = progress.textContent;

    const checkbox = (await waitFor(() => screen.getAllByRole('checkbox')))[1];
    await user.click(checkbox);

    await waitFor(() => {
      const progressAfter = screen.getByText(/\d+ \/ \d+ 已完成/).textContent;
      expect(progressAfter).not.toBe(progressBefore);
    });

    // Wait for the async store operation to finish so it does not leak into the
    // next test's beforeEach cleanup.
    await waitFor(() => {
      expect(useTodayWorkspaceStore.getState().isLoading).toBe(false);
    });
  });

  it('filters to show only overdue tasks', async () => {
    const user = userEvent.setup();
    renderScreen();

    const overdueTab = await waitFor(() =>
      screen.getByRole('button', { name: '逾期' })
    );
    await user.click(overdueTab);

    await waitFor(() => {
      expect(screen.getByText('阅读《深度工作》第三章')).toBeInTheDocument();
    });
    expect(screen.queryByText('完成晨跑 5 km')).not.toBeInTheDocument();
  });

  it('navigates to heatmap insights', async () => {
    const user = userEvent.setup();
    renderScreen();

    const heatmapCard = await waitFor(() =>
      screen.getByLabelText('本周热力图')
    );
    const link = within(heatmapCard).getByText('查看完整洞察');
    await user.click(link);

    await waitFor(() => {
      expect(screen.getByTestId('current-path')).toHaveTextContent('/insights?tab=heatmap');
    });
  });

  it('shows an empty-state CTA when there are no repositories', async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '今天' })).toBeInTheDocument();
    });

    await resetStore();

    await waitFor(() => {
      expect(
        screen.getByText('先创建第一个仓库，把长期目标收进一个清晰边界。')
      ).toBeInTheDocument();
    });
    expect(screen.getAllByRole('button', { name: '新建仓库' }).length).toBeGreaterThanOrEqual(1);
  });

  it('shows a CTA when there are no tasks for the selected filter', async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText('完成晨跑 5 km')).toBeInTheDocument();
    }, { timeout: 5000 });

    act(() => {
      useTodayWorkspaceStore.setState({ tasks: [] });
    });

    await waitFor(() => {
      expect(screen.getByText('今天没有截止任务')).toBeInTheDocument();
    });
    expect(screen.getAllByRole('button', { name: '快速添加任务' }).length).toBeGreaterThanOrEqual(1);
  });
});
