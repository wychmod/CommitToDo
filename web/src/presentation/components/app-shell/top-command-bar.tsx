import { Bell, GitBranch, Plus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';

import { useCommandPaletteStore } from '../command-palette/command-palette.store';
import { useHomeStore } from '../../stores/home-store';
import { WorkspaceSwitcher } from './workspace-switcher';
import { RepositorySwitcher } from './repository-switcher';
import { UserMenu } from './user-menu';
import { SyncStatus } from './sync-status';
import { cn } from '../../../core/utils/formatters';

export interface TopCommandBarProps {
  className?: string;
}

/**
 * Top command bar — the global app skeleton entry point. Hosts the brand,
 * workspace/repository switchers, command palette entry, primary "new"
 * action, sync status, notifications and the user menu.
 *
 * Stays intentionally minimal: no big gradients, no oversized copy, fixed
 * height (56px) so it never competes with the work surface below.
 */
export function TopCommandBar({ className }: TopCommandBarProps): JSX.Element {
  const openPalette = useCommandPaletteStore((s) => s.openPalette);
  const repositories = useHomeStore((s) => s.repositories);
  const load = useHomeStore((s) => s.load);
  const navigate = useNavigate();
  const { id: repoId } = useParams<{ id: string }>();
  const [isMac, setIsMac] = useState(false);

  // Lazily prefetch the workspace repository list so the Repository switcher
  // dropdown is warm when the user clicks it.
  useEffect(() => {
    if (repositories.length === 0) void load();
  }, [repositories.length, load]);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    setIsMac(/mac|iphone|ipad|ipod/i.test(navigator.platform));
  }, []);

  const kbdHint = useMemo(() => (isMac ? '⌘K' : 'Ctrl+K'), [isMac]);

  return (
    <header className={cn('topbar', className)} role="banner">
      {/* Brand */}
      <a
        href="workspace"
        className="flex items-center gap-2 text-ink"
        onClick={(e) => {
          e.preventDefault();
          navigate('/workspace');
        }}
        aria-label="返回工作台"
      >
        <span className="topbar-brand">
          <GitBranch className="h-4 w-4" aria-hidden />
        </span>
        <span className="topbar-brand-label">CommitToDo</span>
      </a>

      <span className="topbar-divider" aria-hidden />

      {/* Workspace */}
      <WorkspaceSwitcher />

      {/* Repository */}
      <RepositorySwitcher activeRepositoryId={repoId} />

      {/* Search / Command */}
      <button
        type="button"
        className="topbar-search"
        onClick={openPalette}
        aria-label="打开命令面板"
      >
        <span className="h-4 w-4 text-ink-subtle" aria-hidden>
          <SearchIcon />
        </span>
        <span className="flex-1 text-left text-ink-subtle">
          搜索任务 / 仓库 / 命令…
        </span>
        <span className="topbar-search-kbd">{kbdHint}</span>
      </button>

      {/* Primary CTA — new task */}
      <button
        type="button"
        className="topbar-action topbar-action-primary"
        onClick={() => {
          if (repoId) navigate(`/repository/${repoId}/task/new`);
          else navigate('/workspace?create=1');
        }}
      >
        <Plus className="h-4 w-4" aria-hidden />
        <span className="hidden mobile:inline">新建</span>
      </button>

      {/* Sync status */}
      <SyncStatus />

      {/* Notifications placeholder */}
      <button
        type="button"
        aria-label="通知（即将支持）"
        className="topbar-icon-btn hidden tablet:inline-flex"
        title="通知（即将支持）"
      >
        <Bell className="h-4 w-4" aria-hidden />
      </button>

      {/* User menu */}
      <UserMenu />
    </header>
  );
}

/** Tiny inline search icon (keeps the topbar search compact). */
function SearchIcon(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
