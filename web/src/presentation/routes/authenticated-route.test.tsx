import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthenticatedRoute } from './authenticated-route';
import { PublicOnlyRoute } from './public-only-route';
import { useAuthStore } from '@/presentation/stores/auth-store';

afterEach(() => {
  useAuthStore.setState({ status: 'guest', session: null, profile: null, error: null });
});

it('redirects guests to login with the complete deep link', async () => {
  useAuthStore.setState({ status: 'guest', session: null });
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
  useAuthStore.setState({ status: 'authenticated', session: { userId: 'u1', provider: 'email' } });
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
