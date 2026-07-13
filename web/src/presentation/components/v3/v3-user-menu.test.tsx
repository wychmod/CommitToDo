import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDemoAuthStore } from '@/presentation/stores/demo-auth-store';
import type { DemoAuthSession } from '@/presentation/screens/auth/auth-types';

import { V3UserMenu } from './v3-user-menu';

function LocationLabel(): JSX.Element {
  const { pathname } = useLocation();
  return <span data-testid="current-path">{pathname}</span>;
}

function renderMenu(initialPath = '/workspace'): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <LocationLabel />
      <V3UserMenu />
    </MemoryRouter>
  );
}

function resetStore(): void {
  useDemoAuthStore.setState({ session: null, operation: null, error: null });
}

function makeSession(
  provider: 'credentials' | 'github' = 'credentials'
): DemoAuthSession {
  return {
    version: 1,
    user: {
      username: 'admin',
      provider,
      signedInAt: '2026-07-14T00:00:00.000Z',
    },
    persistence: 'local',
  };
}

describe('V3UserMenu', () => {
  beforeEach(() => {
    resetStore();
  });

  afterEach(() => {
    resetStore();
  });

  it('shows local mode and demo login entry for guests', async () => {
    renderMenu();

    await userEvent.click(screen.getByRole('button', { name: '用户菜单' }));

    expect(screen.getByText('本地模式')).toBeInTheDocument();
    expect(screen.getByText('数据保存在本机 IndexedDB')).toBeInTheDocument();
    expect(screen.getByText('登录演示账号')).toBeInTheDocument();
    expect(screen.getByText('设置')).toBeInTheDocument();
  });

  it('navigates to /login when the demo login entry is clicked', async () => {
    renderMenu();

    await userEvent.click(screen.getByRole('button', { name: '用户菜单' }));
    await userEvent.click(screen.getByText('登录演示账号'));

    expect(screen.getByTestId('current-path')).toHaveTextContent('/login');
  });

  it('shows admin and the credentials provider label when authenticated', async () => {
    useDemoAuthStore.setState({ session: makeSession('credentials') });
    renderMenu();

    await userEvent.click(screen.getByRole('button', { name: 'admin 用户菜单' }));

    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('账号密码演示登录')).toBeInTheDocument();
    expect(screen.getByText('业务数据仍保存在本机')).toBeInTheDocument();
    expect(screen.getByText('退出登录')).toBeInTheDocument();
  });

  it('shows the GitHub provider label for github sessions', async () => {
    useDemoAuthStore.setState({ session: makeSession('github') });
    renderMenu();

    await userEvent.click(screen.getByRole('button', { name: 'admin 用户菜单' }));

    expect(screen.getByText('GitHub 演示登录')).toBeInTheDocument();
  });

  it('signs out and returns to / on logout', async () => {
    const signOutSpy = vi.fn(() => {
      useDemoAuthStore.setState({ session: null, operation: null, error: null });
    });
    useDemoAuthStore.setState({
      session: makeSession('credentials'),
      signOut: signOutSpy,
    });
    renderMenu();

    await userEvent.click(screen.getByRole('button', { name: 'admin 用户菜单' }));
    const logout = screen.getByRole('button', { name: '退出登录' });
    expect(logout).not.toBeDisabled();
    await userEvent.click(logout);

    expect(signOutSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('current-path')).toHaveTextContent('/');
    expect(useDemoAuthStore.getState().session).toBeNull();
  });
});
