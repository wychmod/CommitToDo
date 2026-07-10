import '@/core/theme/v3-tokens.css';

import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  MemoryRouter,
  Route,
  Routes,
  useSearchParams,
} from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { Commit } from '@/domain/entities/commit';
import { CommitType } from '@/domain/entities/enums';
import { Task } from '@/domain/entities/task';
import { ToastProvider } from '@/presentation/components/common/toast-provider';

// Mock child tab components so we can drive screen-level behavior without
// spinning up ReactFlow or heavy calendars in jsdom.
vi.mock('./graph-tab', () => ({
  GraphTab: (props: {
    onSelectCommit: (commit: Commit) => void;
    commits: Commit[];
  }): JSX.Element => (
    <div data-testid="graph-tab">
      <span>LIFE GRAPH</span>
      <button
        type="button"
        data-testid="graph-node"
        onClick={() => props.onSelectCommit(props.commits[0])}
      >
        Graph Node
      </button>
    </div>
  ),
}));

vi.mock('./activity-tab', () => ({
  ActivityTab: (props: {
    onSelectCommit: (commit: Commit) => void;
    commits: Commit[];
  }): JSX.Element => (
    <div data-testid="activity-tab">
      <button
        type="button"
        data-testid="activity-row"
        onClick={() => props.onSelectCommit(props.commits[0])}
      >
        Activity Row
      </button>
    </div>
  ),
}));

vi.mock('./rhythm-tab', () => ({
  RhythmTab: (): JSX.Element => <div data-testid="rhythm-tab">Rhythm Content</div>,
}));

vi.mock('./commit-detail-card', () => ({
  CommitDetailCard: (props: {
    commit: Commit | null;
    onViewTasks: (commit: Commit) => void;
    onCopyHash: (hash: string) => void;
  }): JSX.Element => {
    if (!props.commit) {
      return <div data-testid="empty-detail">选择一个提交</div>;
    }
    return (
      <div data-testid="commit-detail">
        <span>{props.commit.message}</span>
        <button
          type="button"
          data-testid="view-tasks"
          onClick={() => props.onViewTasks(props.commit!)}
        >
          查看相关任务
        </button>
        <button
          type="button"
          data-testid="copy-hash"
          onClick={() => props.onCopyHash(props.commit!.id)}
        >
          复制哈希
        </button>
      </div>
    );
  },
}));

vi.mock('./rhythm-summary-card', () => ({
  RhythmSummaryCard: (props: { onClick: () => void }): JSX.Element => (
    <button type="button" data-testid="rhythm-summary" onClick={props.onClick}>
      节奏摘要
    </button>
  ),
}));

// Mock stores so we control state without touching IndexedDB.
const selectCommitMock = vi.fn();
const setScopeMock = vi.fn();
const loadForScopeMock = vi.fn().mockResolvedValue(undefined);
const loadRepositoriesMock = vi.fn().mockResolvedValue(undefined);

let storeState: {
  repositories: unknown[];
  branches: unknown[];
  commits: Commit[];
  tasks: Task[];
  selectedCommit: Commit | null;
  isLoading: boolean;
  scope: {
    repositoryId?: string;
    branchId?: string;
    tab: string;
    range: string;
  };
  setScope: (partial: Record<string, unknown>) => void;
  selectCommit: (commit: Commit | null) => void;
  loadForScope: () => Promise<void>;
  loadRepositories: () => Promise<void>;
};

vi.mock('@/presentation/stores/insights-store', () => ({
  useInsightsStore: Object.assign(
    (selector?: (state: typeof storeState) => unknown): unknown =>
      selector ? selector(storeState) : storeState,
    {
      getState: () => storeState,
    }
  ),
  InsightsTab: {},
  InsightsRange: {},
  filterTasksByCompletionRange: (tasks: Task[]) => tasks,
}));

vi.mock('@/presentation/stores/home-store', () => ({
  useHomeStore: (
    selector: (state: { repositories: unknown[]; load: () => void }) => unknown
  ): unknown =>
    selector({
      repositories: [],
      load: vi.fn(),
    }),
}));

vi.mock('@/presentation/components/v3/v3-app-shell', () => ({
  V3AppShell: ({ children }: { children: React.ReactNode }): JSX.Element => (
    <div data-testid="v3-app-shell">{children}</div>
  ),
}));

vi.mock('@/presentation/components/v3/v3-button', () => ({
  V3Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }): JSX.Element => (
    <button type="button" onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@/presentation/components/v3/v3-card', () => ({
  V3Card: ({ children }: { children: React.ReactNode }): JSX.Element => (
    <div>{children}</div>
  ),
}));

function TestHarness({
  initialEntry,
}: {
  initialEntry: string;
}): JSX.Element {
  return (
    <ToastProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/insights" element={<InsightsScreen />} />
          <Route path="/repository/:id/tasks" element={<TaskPage />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>
  );
}

function TaskPage(): JSX.Element {
  const [params] = useSearchParams();
  return <div data-testid="task-page">{params.toString()}</div>;
}

import { InsightsScreen } from './insights-screen';

describe('InsightsScreen', () => {
  const testCommit = Commit.create('task-1', 'branch-1', 'Test commit', CommitType.create);

  beforeEach(() => {
    vi.clearAllMocks();
    storeState = {
      repositories: [],
      branches: [],
      commits: [testCommit],
      tasks: [],
      selectedCommit: null,
      isLoading: false,
      scope: {
        repositoryId: undefined,
        branchId: undefined,
        tab: 'graph',
        range: '90d',
      },
      setScope: setScopeMock,
      selectCommit: selectCommitMock,
      loadForScope: loadForScopeMock,
      loadRepositories: loadRepositoriesMock,
    };

  });

  it('renders title, filters and three tabs', () => {
    render(<TestHarness initialEntry="/insights" />);

    expect(screen.getByText('Insights')).toBeInTheDocument();
    expect(screen.getByText('洞察')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '活动' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '图谱' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '节奏' })).toBeInTheDocument();
    expect(screen.getByLabelText('洞察范围筛选')).toBeInTheDocument();
  });

  it('defaults to graph tab and shows LIFE GRAPH', () => {
    render(<TestHarness initialEntry="/insights" />);

    expect(screen.getByTestId('graph-tab')).toBeInTheDocument();
    expect(screen.getByText('LIFE GRAPH')).toBeInTheDocument();
  });

  it('switches to activity tab when clicked', async () => {
    const user = userEvent.setup();
    render(<TestHarness initialEntry="/insights" />);

    await user.click(screen.getByRole('tab', { name: '活动' }));

    expect(setScopeMock).toHaveBeenCalledWith({ tab: 'activity' });
  });

  it('switches to rhythm tab when clicked', async () => {
    const user = userEvent.setup();
    render(<TestHarness initialEntry="/insights" />);

    await user.click(screen.getByRole('tab', { name: '节奏' }));

    expect(setScopeMock).toHaveBeenCalledWith({ tab: 'heatmap' });
  });

  it('updates selected commit and URL when graph node is clicked', async () => {
    const user = userEvent.setup();
    render(<TestHarness initialEntry="/insights" />);

    await user.click(screen.getByTestId('graph-node'));

    expect(selectCommitMock).toHaveBeenCalledWith(testCommit);
  });

  it('navigates to repository tasks with commit hash', async () => {
    const user = userEvent.setup();
    storeState.selectedCommit = testCommit;
    storeState.branches = [
      {
        id: 'branch-1',
        repositoryId: 'repo-1',
        name: 'main',
        color: '#80e48c',
      },
    ] as unknown[];

    render(<TestHarness initialEntry="/insights" />);

    await user.click(screen.getByTestId('view-tasks'));

    expect(screen.getByTestId('task-page')).toHaveTextContent(
      `commit=${testCommit.id.slice(0, 7)}`
    );
  });

  it('copies hash and shows toast when copy button clicked', async () => {
    const user = userEvent.setup();
    storeState.selectedCommit = testCommit;

    render(<TestHarness initialEntry="/insights" />);

    await user.click(screen.getByTestId('copy-hash'));

    await waitFor(() => {
      expect(screen.getByText('提交哈希已复制')).toBeInTheDocument();
    });
  });

  it('updates URL params when scope filters change', async () => {
    const user = userEvent.setup();
    storeState.repositories = [
      { id: 'repo-1', name: 'Repo A' },
    ] as unknown[];

    render(<TestHarness initialEntry="/insights" />);

    await user.click(screen.getByRole('button', { name: '指定仓库' }));

    expect(setScopeMock).toHaveBeenCalledWith(
      expect.objectContaining({ repositoryId: 'repo-1' })
    );
  });

  it('shows empty state when no commits exist', () => {
    storeState.commits = [];
    render(<TestHarness initialEntry="/insights" />);

    expect(screen.getByText('还没有提交')).toBeInTheDocument();
  });

  it('shows scope empty state when filtered range has no data', () => {
    storeState.commits = [];
    storeState.scope.range = 'year';
    render(<TestHarness initialEntry="/insights?range=year" />);

    expect(screen.getByText('这个范围还没有活动')).toBeInTheDocument();
  });
});
