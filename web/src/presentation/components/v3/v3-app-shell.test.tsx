import '@/core/theme/v3-tokens.css';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { V3AppShell } from './v3-app-shell';
import type { Repository } from '@/domain/entities/repository';

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

function LocationLabel(): JSX.Element {
  const location = useLocation();
  return <span data-testid="current-path">{location.pathname}</span>;
}

function renderShell(initialEntry: string, repoId?: string): void {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/workspace"
          element={
            <V3AppShell currentRepositoryId={repoId}>
              <LocationLabel />
              <div data-testid="workspace-content">Workspace</div>
            </V3AppShell>
          }
        />
        <Route
          path="/repository/:id"
          element={
            <V3AppShell>
              <LocationLabel />
              <div data-testid="repo-content">Repository</div>
            </V3AppShell>
          }
        />
        <Route
          path="/repository/:id/tasks"
          element={
            <V3AppShell>
              <LocationLabel />
              <div data-testid="repo-tasks-content">Repository Tasks</div>
            </V3AppShell>
          }
        />
        <Route
          path="/insights"
          element={
            <V3AppShell currentRepositoryId={repoId}>
              <LocationLabel />
              <div data-testid="insights-content">Insights</div>
            </V3AppShell>
          }
        />
        <Route
          path="/settings"
          element={
            <V3AppShell currentRepositoryId={repoId}>
              <LocationLabel />
              <div data-testid="settings-content">Settings</div>
            </V3AppShell>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('V3AppShell', () => {
  beforeEach(() => {
    openPaletteMock.mockClear();
    homeStoreState = {
      repositories: [],
      load: vi.fn(),
    };
  });

  it('renders the top command bar, left navigation and bottom status bar', () => {
    renderShell('/workspace');

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('renders the same five primary navigation items on /workspace', () => {
    renderShell('/workspace');

    expect(screen.getByRole('link', { name: '今日' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '仓库概览' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '仓库任务' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '洞察' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '设置' })).toBeInTheDocument();
  });

  it('renders the same five primary navigation items when inside a repository', () => {
    renderShell('/repository/repo-1', 'repo-1');

    expect(screen.getByRole('link', { name: '今日' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '仓库概览' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '仓库任务' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '洞察' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '设置' })).toBeInTheDocument();
  });

  it('navigates to the target route when a nav link is clicked', async () => {
    const user = userEvent.setup();
    renderShell('/workspace');

    await user.click(screen.getByRole('link', { name: '洞察' }));

    expect(screen.getByTestId('current-path')).toHaveTextContent('/insights');
    expect(screen.getByTestId('insights-content')).toBeInTheDocument();
  });

  it('navigates between repository overview and repository tasks', async () => {
    const user = userEvent.setup();
    renderShell('/repository/repo-1');

    expect(screen.getByTestId('current-path')).toHaveTextContent('/repository/repo-1');

    await user.click(screen.getByRole('link', { name: '仓库任务' }));

    expect(screen.getByTestId('current-path')).toHaveTextContent('/repository/repo-1/tasks');
    expect(screen.getByTestId('repo-tasks-content')).toBeInTheDocument();
  });

  it('opens the command palette when the search entry is clicked', async () => {
    const user = userEvent.setup();
    renderShell('/workspace');

    await user.click(screen.getByRole('button', { name: '打开命令面板' }));

    expect(openPaletteMock).toHaveBeenCalledTimes(1);
  });

  it('shows the IndexedDB saved status in the bottom bar', () => {
    renderShell('/workspace');

    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveTextContent('IndexedDB');
    expect(footer).toHaveTextContent('已保存');
    expect(footer).toHaveTextContent('离线可用');
  });

  it('lists recent repositories in the left navigation', () => {
    homeStoreState = {
      repositories: [
        {
          id: 'repo-1',
          name: '设计系统',
          color: '#6e95ff',
          icon: 'repository',
        } as Repository,
        {
          id: 'repo-2',
          name: '营销活动',
          color: '#59cbd0',
          icon: 'repository',
        } as Repository,
      ],
      load: vi.fn(),
    };

    renderShell('/workspace');

    expect(screen.getByRole('link', { name: '设计系统' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '营销活动' })).toBeInTheDocument();
  });

  it('renders the command palette component', () => {
    renderShell('/workspace');

    expect(screen.getByTestId('command-palette')).toBeInTheDocument();
  });
});
