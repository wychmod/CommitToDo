import { GitBranch, Network, ListTodo, GitCommit, BarChart3, Search, Settings as SettingsIcon } from 'lucide-react';
import { NavLink, useLocation, useParams } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

export interface ContextTabsProps {
  repositoryName?: string | null;
  branchName?: string | null;
}

interface TabSpec {
  label: string;
  icon: LucideIcon;
  /**
   * Matches the active location via a path equality / startsWith check; the
   * function returns `true` when the tab should be marked as selected.
   */
  matches: (pathname: string, repoId: string) => boolean;
  buildHref: (repoId: string) => string;
  /** If true, only render when we're inside a repository. */
  repoScoped: boolean;
}

const TABS: TabSpec[] = [
  {
    label: '任务',
    icon: ListTodo,
    matches: (p, repoId) => p === `/repository/${repoId}`,
    buildHref: (repoId) => `/repository/${repoId}`,
    repoScoped: true,
  },
  {
    label: '提交',
    icon: GitCommit,
    matches: (p, repoId) => p.startsWith(`/repository/${repoId}/commits`),
    buildHref: (repoId) => `/repository/${repoId}/commits`,
    repoScoped: true,
  },
  {
    label: 'Graph',
    icon: Network,
    matches: (p, repoId) => p.startsWith(`/repository/${repoId}/graph`),
    buildHref: (repoId) => `/repository/${repoId}/graph`,
    repoScoped: true,
  },
  {
    label: 'Heatmap',
    icon: BarChart3,
    matches: (p, repoId) => p.startsWith(`/repository/${repoId}/heatmap`),
    buildHref: (repoId) => `/repository/${repoId}/heatmap`,
    repoScoped: true,
  },
  {
    label: '搜索',
    icon: Search,
    matches: (p, repoId) => p.startsWith(`/repository/${repoId}/search`),
    buildHref: (repoId) => `/repository/${repoId}/search`,
    repoScoped: true,
  },
  {
    label: '设置',
    icon: SettingsIcon,
    matches: (p, repoId) => p.startsWith(`/repository/${repoId}/settings`),
    buildHref: (repoId) => `/repository/${repoId}/settings`,
    repoScoped: true,
  },
];

/**
 * Repository context tabs. Renders the row of tabs that sits below the top
 * command bar when the user is inside a repository — these replace the old
 * left-nav role for repo-scoped pages only. When the user is at workspace
 * scope, the row collapses to a thin label so the chrome stays consistent.
 */
export function ContextTabs({
  repositoryName,
  branchName,
}: ContextTabsProps): JSX.Element {
  const { id: repoIdParam } = useParams<{ id: string }>();
  const { pathname } = useLocation();

  if (!repoIdParam) {
    return (
      <nav
        className="context-tabs"
        aria-label="Application tabs"
        role="navigation"
      >
        <span className="ml-1 text-[11px] uppercase tracking-[0.12em] text-ink-subtle">
          Workspace Overview
        </span>
        <span className="ml-auto mr-1 hidden items-center gap-1.5 text-[11px] text-ink-subtle mobile:inline-flex">
          <GitBranch className="h-3 w-3" aria-hidden />
          <span>选择一个仓库开始</span>
        </span>
      </nav>
    );
  }

  const visibleTabs = TABS.filter((t) => t.repoScoped);

  return (
    <nav
      className="context-tabs"
      aria-label={`Repository tabs for ${repositoryName ?? repoIdParam}`}
      role="navigation"
    >
      <span className="ml-1 mr-3 hidden items-center gap-2 text-xs text-ink-muted tablet:flex">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-subtle">
          Repo
        </span>
        <span className="font-medium text-ink truncate max-w-[180px]">
          {repositoryName ?? repoIdParam}
        </span>
        {branchName ? (
          <>
            <span className="text-ink-subtle">/</span>
            <span className="font-mono text-[11px] text-primary">{branchName}</span>
          </>
        ) : null}
      </span>
      {visibleTabs.map((tab) => {
        const isActive = tab.matches(pathname, repoIdParam);
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.label}
            to={tab.buildHref(repoIdParam)}
            className="context-tab"
            data-active={isActive ? 'true' : 'false'}
          >
            <Icon className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            <span>{tab.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
