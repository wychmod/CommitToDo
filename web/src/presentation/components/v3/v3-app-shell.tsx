import '@/core/theme/v3-tokens.css';

import * as React from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { BarChart3, Folder, LayoutDashboard, Search } from 'lucide-react';

import { Repository } from '@/domain/entities/repository';
import { CommandPalette } from '@/presentation/components/command-palette/command-palette';
import { cn } from '@/core/utils/formatters';
import { useCommandPaletteStore } from '@/presentation/components/command-palette/command-palette.store';
import { V3TopCommandBar } from './v3-top-command-bar';
import { V3LeftNavigation } from './v3-left-navigation';
import { V3BottomStatusBar } from './v3-bottom-status-bar';

export interface V3AppShellProps {
  children: React.ReactNode;
  currentRepositoryId?: string;
  recentRepositories?: Repository[];
  className?: string;
}

/**
 * V3 application shell.
 *
 * Shared chrome for the five V3 app pages: fixed top command bar, optional
 * 252px left navigation on desktop, a fixed bottom status bar and a mobile
 * bottom navigation rail for viewports below 1024px.
 */
export function V3AppShell({
  children,
  currentRepositoryId: propRepoId,
  recentRepositories,
  className,
}: V3AppShellProps): JSX.Element {
  const params = useParams<{ id: string }>();
  const currentRepositoryId = propRepoId ?? params.id;

  return (
    <div
      className={cn(
        'min-h-screen bg-[var(--v3-bg)] font-sans text-[var(--v3-text)]',
        className
      )}
    >
      <V3TopCommandBar currentRepositoryId={currentRepositoryId} />
      <V3LeftNavigation
        currentRepositoryId={currentRepositoryId}
        recentRepositories={recentRepositories}
      />
      <main
        className={cn(
          'mt-[var(--v3-top-bar-height)] min-h-[calc(100vh-var(--v3-top-bar-height)-var(--v3-status-bar-height)-var(--v3-mobile-nav-height))] pb-[calc(var(--v3-status-bar-height)+var(--v3-mobile-nav-height))]',
          'laptop:ml-[var(--v3-nav-width)] laptop:min-h-[calc(100vh-var(--v3-top-bar-height)-var(--v3-status-bar-height))] laptop:pb-[var(--v3-status-bar-height)]'
        )}
        aria-label="应用主体"
      >
        {children}
      </main>
      <V3BottomStatusBar />
      <MobileBottomNav currentRepositoryId={currentRepositoryId} />
      <CommandPalette />
    </div>
  );
}

interface MobileBottomNavProps {
  currentRepositoryId?: string;
}

function MobileBottomNav({
  currentRepositoryId,
}: MobileBottomNavProps): JSX.Element {
  const location = useLocation();
  const openPalette = useCommandPaletteStore((s) => s.openPalette);

  const repositoryHref = currentRepositoryId
    ? `/repository/${currentRepositoryId}`
    : '/workspace';

  const isActive = (href: string): boolean => location.pathname === href;
  const isRepositoryActive =
    currentRepositoryId !== undefined &&
    location.pathname.startsWith(`/repository/${currentRepositoryId}`);

  return (
    <nav
      className="fixed bottom-[var(--v3-status-bar-height)] left-0 right-0 z-30 flex h-[var(--v3-mobile-nav-height)] items-center justify-around border-t border-[var(--v3-border-soft)] bg-[var(--v3-header)] laptop:hidden"
      aria-label="移动端主导航"
    >
      <MobileNavLink
        href="/workspace"
        icon={LayoutDashboard}
        label="今日"
        active={isActive('/workspace')}
      />
      <MobileNavLink
        href={repositoryHref}
        icon={Folder}
        label="仓库"
        active={isRepositoryActive}
      />
      <MobileNavLink
        href="/insights"
        icon={BarChart3}
        label="洞察"
        active={isActive('/insights')}
      />
      <button
        type="button"
        onClick={openPalette}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[11px] text-[var(--v3-text-muted)] transition-colors hover:text-[var(--v3-text)]"
        aria-label="打开命令面板"
      >
        <Search size={18} strokeWidth={1.5} aria-hidden="true" />
        <span>搜索</span>
      </button>
    </nav>
  );
}

interface MobileNavLinkProps {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  active: boolean;
}

function MobileNavLink({
  href,
  icon: Icon,
  label,
  active,
}: MobileNavLinkProps): JSX.Element {
  return (
    <Link
      to={href}
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[11px] transition-colors',
        active
          ? 'text-[var(--v3-primary)]'
          : 'text-[var(--v3-text-muted)] hover:text-[var(--v3-text)]'
      )}
      aria-current={active ? 'page' : undefined}
    >
      <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}
