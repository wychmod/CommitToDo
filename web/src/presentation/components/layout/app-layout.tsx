import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useMemo } from 'react';

import { TopCommandBar } from '../app-shell/top-command-bar';
import { ContextTabs } from '../app-shell/context-tabs';
import { CommandPalette } from '../command-palette/command-palette';
import { SafeArea } from './safe-area';
import { useHomeStore } from '../../stores/home-store';
import { useRepositoryStore } from '../../stores/repository-store';

/**
 * Top-level chrome for the application — a 56px top command bar followed by
 * a 46px repository context tabs row, with the routed content rendered below.
 * Replaces the original left-side fixed nav with the design doc's "TopCommand
 * Bar + ContextTabs + Work Surface" model.
 */
export function AppLayout(): JSX.Element {
  const navigate = useNavigate();
  const { id: routeRepoId } = useParams<{ id: string }>();
  const { repositories, load: loadRepos } = useHomeStore();
  const { repository, activeBranchId, branches, loadData } = useRepositoryStore();

  // Pull the repository list (populates the topbar's switcher)
  useEffect(() => {
    if (repositories.length === 0) void loadRepos();
  }, [repositories.length, loadRepos]);

  // When we have a repo in the URL, hydrate the repository store
  useEffect(() => {
    if (routeRepoId) {
      void loadData(routeRepoId);
    }
  }, [routeRepoId, loadData]);

  // Listen for "?create=1" deep links from the topbar
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('create') === '1') {
      // Surface the create-repo dialog by navigating to the workspace page
      // and clearing the flag.
      navigate('/workspace?create=1', { replace: true });
    }
  }, [navigate]);

  const activeBranchName = useMemo(() => {
    if (!activeBranchId) return null;
    return branches.find((b) => b.id === activeBranchId)?.name ?? null;
  }, [activeBranchId, branches]);

  return (
    <SafeArea>
      <div className="app-shell">
        <TopCommandBar />
        <ContextTabs
          repositoryName={repository?.name ?? null}
          branchName={activeBranchName}
        />
        <main className="app-body" aria-label="应用主体">
          <Outlet />
        </main>
        <CommandPalette />
      </div>
    </SafeArea>
  );
}
