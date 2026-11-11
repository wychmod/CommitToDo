import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthenticatedRoute } from './authenticated-route';
import { PublicOnlyRoute } from './public-only-route';
import { WorkspaceOwnershipGuard } from './workspace-ownership-guard';
import { useAuthStore } from '@/presentation/stores/auth-store';

const originalResolveLocalWorkspace = useAuthStore.getState().resolveLocalWorkspace;

it('redirects guests to login with the complete deep link', async () => {
  useAuthStore.setState({ status: 'guest', mode: 'cloud', session: null, profile: null });
  render(
    <MemoryRouter initialEntries={['/repository/r1/tasks?status=todo#open']}>
      <Routes>
        <Route path="*" element={<AuthenticatedRoute><p>private</p></AuthenticatedRoute>} />
        <Route path="/login" element={<p data-testid="login">login</p>} />
      </Routes>
    </MemoryRouter>
  );

  await waitFor(() => expect(screen.getByTestId('login')).toBeInTheDocument());
});

it('redirects authenticated visitors away from guest-only content', async () => {
  useAuthStore.setState({
    status: 'authenticated',
    mode: 'cloud',
    session: { userId: 'u1', provider: 'email' },
  });
  render(
    <MemoryRouter initialEntries={['/login?returnTo=%2Fsettings']}>
      <Routes>
        <Route path="/login" element={<PublicOnlyRoute><p>login</p></PublicOnlyRoute>} />
        <Route path="/settings" element={<p data-testid="settings">settings</p>} />
      </Routes>
    </MemoryRouter>
  );

  await waitFor(() => expect(screen.getByTestId('settings')).toBeInTheDocument());
});

it('renders protected content in local mode without a session', () => {
  useAuthStore.setState({ mode: 'local', status: 'guest', session: null, profile: null });
  render(
    <MemoryRouter initialEntries={['/workspace']}>
      <Routes>
        <Route path="*" element={<AuthenticatedRoute><p>private</p></AuthenticatedRoute>} />
        <Route path="/login" element={<p data-testid="login">login</p>} />
      </Routes>
    </MemoryRouter>
  );

  expect(screen.getByText('private')).toBeInTheDocument();
  expect(screen.queryByTestId('login')).not.toBeInTheDocument();
});

it('skips workspace ownership resolution in local mode', () => {
  const resolveLocalWorkspace = vi.fn().mockResolvedValue({
    type: 'claimed-by-current',
    owner: { principalId: 'local', claimedAt: new Date().toISOString() },
    requiresReload: false,
  });
  useAuthStore.setState({
    mode: 'local',
    status: 'guest',
    session: null,
    profile: null,
    resolveLocalWorkspace,
  });

  render(
    <MemoryRouter>
      <WorkspaceOwnershipGuard><p>workspace</p></WorkspaceOwnershipGuard>
    </MemoryRouter>
  );

  expect(screen.getByText('workspace')).toBeInTheDocument();
  expect(resolveLocalWorkspace).not.toHaveBeenCalled();

  useAuthStore.setState({ resolveLocalWorkspace: originalResolveLocalWorkspace });
});
