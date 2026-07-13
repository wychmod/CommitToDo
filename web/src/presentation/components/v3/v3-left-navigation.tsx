import '@/core/theme/v3-tokens.css';

import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  ChevronRight,
  Folder,
  LayoutDashboard,
  ListTodo,
  Settings,
} from 'lucide-react';

import { cn } from '@/core/utils/formatters';
import { Repository } from '@/domain/entities/repository';
import { useHomeStore } from '@/presentation/stores/home-store';

export interface V3LeftNavigationProps {
  currentRepositoryId?: string;
  recentRepositories?: Repository[];
  className?: string;
}

interface NavItemSpec {
  id: string;
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  isSelected: boolean;
}

/**
 * V3 left navigation rail.
 *
 * 252px fixed sidebar with the same five primary links on every app page:
 * 今日 / 仓库概览 / 仓库任务 / 洞察 / 设置. When no repository is active,
 * repo-scoped links fall back to the most recent repository or the workspace.
 */
export function V3LeftNavigation({
  currentRepositoryId,
  recentRepositories: recentProp,
  className,
}: V3LeftNavigationProps): JSX.Element {
  const location = useLocation();
  const storeRepositories = useHomeStore((s) => s.repositories);
  const recent = recentProp ?? storeRepositories.slice(0, 5);
  const path = location.pathname;

  const effectiveRepositoryId = currentRepositoryId ?? recent[0]?.id;

  const items = React.useMemo<NavItemSpec[]>(() => {
    const base: NavItemSpec[] = [
      {
        id: 'today',
        label: '今日',
        href: '/workspace',
        icon: LayoutDashboard,
        isSelected: path === '/workspace',
      },
      {
        id: 'repository-overview',
        label: '仓库概览',
        href: effectiveRepositoryId
          ? `/repository/${effectiveRepositoryId}`
          : '/workspace',
        icon: Folder,
        isSelected: effectiveRepositoryId
          ? path === `/repository/${effectiveRepositoryId}` ||
            path.startsWith(`/repository/${effectiveRepositoryId}/tasks/`)
          : false,
      },
      {
        id: 'repository-tasks',
        label: '仓库任务',
        href: effectiveRepositoryId
          ? `/repository/${effectiveRepositoryId}/tasks`
          : '/workspace',
        icon: ListTodo,
        isSelected: effectiveRepositoryId
          ? path === `/repository/${effectiveRepositoryId}/tasks`
          : false,
      },
      {
        id: 'insights',
        label: '洞察',
        href: '/insights',
        icon: BarChart3,
        isSelected: path === '/insights',
      },
      {
        id: 'settings',
        label: '设置',
        href: '/settings',
        icon: Settings,
        isSelected: path === '/settings',
      },
    ];

    return base;
  }, [path, effectiveRepositoryId]);

  return (
    <nav
      className={cn(
        'fixed bottom-[var(--v3-status-bar-height)] left-0 top-[var(--v3-top-bar-height)] z-30 hidden w-[var(--v3-nav-width)] flex-col border-r border-[var(--v3-border-soft)] bg-[var(--v3-sidebar)] laptop:flex',
        className
      )}
      aria-label="主导航"
    >
      <div className="flex flex-col gap-1 px-3 py-4">
        <SectionTitle>Workspace</SectionTitle>
        {items.map((item) => (
          <NavItem key={item.id} item={item} />
        ))}
      </div>

      {recent.length > 0 ? (
        <div className="flex flex-col gap-1 border-t border-[var(--v3-divider)] px-3 py-4">
          <SectionTitle>Recent</SectionTitle>
          {recent.map((repo) => (
            <NavItem
              key={repo.id}
              item={{
                id: `recent-${repo.id}`,
                label: repo.name,
                href: `/repository/${repo.id}`,
                icon: Folder,
                isSelected: path === `/repository/${repo.id}`,
              }}
              accentColor={repo.color}
            />
          ))}
        </div>
      ) : null}
    </nav>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--v3-text-muted)]">
      {children}
    </p>
  );
}

interface NavItemProps {
  item: NavItemSpec;
  accentColor?: string;
}

function NavItem({ item, accentColor }: NavItemProps): JSX.Element {
  const Icon = item.icon;
  return (
    <Link
      to={item.href}
      className={cn(
        'group relative flex h-[44px] items-center gap-3 rounded-[var(--v3-radius-md)] px-3 text-[15px] transition-[background-color,color] duration-(--v3-fast) ease-out focus-visible:outline-none focus-visible:[box-shadow:var(--v3-focus-ring)]',
        item.isSelected
          ? 'bg-[var(--v3-selected)] font-medium text-[var(--v3-primary)]'
          : 'text-[var(--v3-text-secondary)] hover:bg-[var(--v3-control)] hover:text-[var(--v3-text-strong)]'
      )}
      aria-current={item.isSelected ? 'page' : undefined}
    >
      {item.isSelected ? (
        <span
          className="absolute left-0 top-1/2 h-[18px] w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--v3-primary)]"
          aria-hidden="true"
        />
      ) : null}
      {accentColor ? (
        <span
          className="h-[18px] w-[18px] shrink-0 rounded-[var(--v3-radius-sm)]"
          style={{ backgroundColor: accentColor }}
          aria-hidden="true"
        />
      ) : (
        <Icon
          size={18}
          strokeWidth={1.5}
          aria-hidden="true"
          className={cn(
            'shrink-0',
            item.isSelected ? 'text-[var(--v3-primary)]' : 'text-[var(--v3-text-muted)] group-hover:text-[var(--v3-text-strong)]'
          )}
        />
      )}
      <span className="flex-1 truncate">{item.label}</span>
      {!item.isSelected && item.href.startsWith('/repository/') ? (
        <ChevronRight
          size={14}
          strokeWidth={1.5}
          aria-hidden="true"
          className="text-[var(--v3-text-muted)] opacity-0 transition-opacity duration-(--v3-fast) group-hover:opacity-100"
        />
      ) : null}
    </Link>
  );
}
