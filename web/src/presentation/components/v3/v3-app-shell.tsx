import '@/core/theme/v3-tokens.css';

import * as React from 'react';
import { useParams } from 'react-router-dom';

import { Repository } from '@/domain/entities/repository';
import { CommandPalette } from '@/presentation/components/command-palette/command-palette';
import { cn } from '@/core/utils/formatters';
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
 * Shared chrome for the five V3 app pages: fixed 68px top command bar, 252px
 * left navigation, 48px bottom status bar and a scrollable main content area.
 * The repository context can be passed explicitly or inferred from the current
 * `/repository/:id` route parameter.
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
        className="ml-[252px] mt-[68px] min-h-[calc(100vh-68px-48px)] pb-[48px]"
        aria-label="应用主体"
      >
        {children}
      </main>
      <V3BottomStatusBar />
      <CommandPalette />
    </div>
  );
}
