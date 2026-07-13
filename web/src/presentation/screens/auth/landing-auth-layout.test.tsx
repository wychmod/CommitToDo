import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDemoAuthStore } from '@/presentation/stores/demo-auth-store';

import { LandingAuthLayout } from './landing-auth-layout';
import { authModeFromPathname } from './landing-auth-layout';

let landingMountCount = 0;

vi.mock('@/presentation/screens/landing/landing-page', () => ({
  LandingPage: function MockLandingPage(): JSX.Element {
    React.useEffect(() => {
      landingMountCount += 1;
    }, []);
    return <div data-testid="landing-page">Landing</div>;
  },
}));

vi.mock('@/presentation/screens/landing/landing-theme.css', () => ({}));

function LocationLabel(): JSX.Element {
  const { pathname } = useLocation();
  return <span data-testid="current-path">{pathname}</span>;
}

function renderAt(initialPath: string): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <LocationLabel />
      <Routes>
        <Route path="/" element={<LandingAuthLayout />}>
          <Route index element={null} />
          <Route path="login" element={null} />
          <Route path="signup" element={null} />
        </Route>
        <Route path="workspace" element={<div data-testid="workspace" />} />
      </Routes>
    </MemoryRouter>
  );
}

function resetStore(): void {
  useDemoAuthStore.setState({ session: null, operation: null, error: null });
}

describe('authModeFromPathname', () => {
  it('maps /login and /signup, null otherwise', () => {
    expect(authModeFromPathname('/login')).toBe('login');
    expect(authModeFromPathname('/signup')).toBe('signup');
    expect(authModeFromPathname('/')).toBeNull();
    expect(authModeFromPathname('/workspace')).toBeNull();
  });
});

describe('LandingAuthLayout', () => {
  beforeEach(() => {
    landingMountCount = 0;
    resetStore();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    resetStore();
  });

  it('keeps the dialog closed on /', () => {
    renderAt('/');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('landing-page')).toBeInTheDocument();
  });

  it('opens the login dialog on /login', () => {
    renderAt('/login');

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('欢迎回来')).toBeInTheDocument();
  });

  it('opens the signup dialog on /signup', () => {
    renderAt('/signup');

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('创建你的工作区')).toBeInTheDocument();
  });

  it('closes the dialog (replace to /) when the close button is clicked', async () => {
    renderAt('/login');

    await userEvent.click(screen.getByRole('button', { name: '关闭登录与注册' }));

    expect(screen.getByTestId('current-path')).toHaveTextContent('/');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('navigates to /signup when the signup tab is clicked', async () => {
    renderAt('/login');

    await userEvent.click(screen.getByRole('tab', { name: '注册' }));

    expect(screen.getByTestId('current-path')).toHaveTextContent('/signup');
  });

  it('keeps LandingPage mounted (count 1) when switching /login -> /signup', async () => {
    renderAt('/login');
    expect(landingMountCount).toBe(1);

    await userEvent.click(screen.getByRole('tab', { name: '注册' }));

    expect(screen.getByTestId('current-path')).toHaveTextContent('/signup');
    expect(landingMountCount).toBe(1);
  });

  it('redirects authenticated visitors from /login to /workspace', async () => {
    renderAt('/login');
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    useDemoAuthStore.setState({
      session: {
        version: 1,
        user: {
          username: 'admin',
          provider: 'credentials',
          signedInAt: '2026-07-14T00:00:00.000Z',
        },
        persistence: 'local',
      },
    });

    await waitFor(() =>
      expect(screen.getByTestId('current-path')).toHaveTextContent('/workspace')
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
