import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/presentation/stores/auth-store';

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
  useAuthStore.setState({
    status: 'guest',
    session: null,
    profile: null,
    operation: null,
    error: null,
  });
}

describe('V3UserMenu', () => {
  beforeEach(() => {
    resetStore();
  });

  afterEach(() => {
    resetStore();
  });

  it('shows local mode and login entry for guests', async () => {
    renderMenu();

    await userEvent.click(screen.getByRole('button', { name: '用户菜单' }));

    expect(screen.getByText('本地模式')).toBeInTheDocument();
    expect(screen.getByText('数据保存在本机 IndexedDB')).toBeInTheDocument();
    expect(screen.getByText('登录')).toBeInTheDocument();
    expect(screen.getByText('设置')).toBeInTheDocument();
  });

  it('navigates to /login when the login entry is clicked', async () => {
    renderMenu();

    await userEvent.click(screen.getByRole('button', { name: '用户菜单' }));
    await userEvent.click(screen.getByText('登录'));

    expect(screen.getByTestId('current-path')).toHaveTextContent('/login');
  });

  it('shows email and the email provider label when authenticated', async () => {
    useAuthStore.setState({
      status: 'authenticated',
      session: {
        userId: 'principal-1',
        email: 'user@example.com',
        provider: 'email',
        expiresAt: Date.now() + 3600_000,
      },
      profile: {
        principalId: 'principal-1',
        email: 'user@example.com',
        displayName: 'Test User',
        avatarUrl: null,
        locale: 'zh-CN',
        securityVersion: 1,
        identities: [],
      },
    });
    renderMenu();

    await userEvent.click(screen.getByRole('button', { name: 'Test User 用户菜单' }));

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
    expect(screen.getByText('邮箱登录')).toBeInTheDocument();
    expect(screen.getByText('业务数据仍保存在本机')).toBeInTheDocument();
    expect(screen.getByText('退出登录')).toBeInTheDocument();
  });

  it('shows the GitHub provider label for github sessions', async () => {
    useAuthStore.setState({
      status: 'authenticated',
      session: {
        userId: 'principal-2',
        email: null,
        provider: 'github',
        expiresAt: Date.now() + 3600_000,
      },
      profile: {
        principalId: 'principal-2',
        email: null,
        displayName: 'GitHub User',
        avatarUrl: null,
        locale: 'zh-CN',
        securityVersion: 1,
        identities: [],
      },
    });
    renderMenu();

    await userEvent.click(screen.getByRole('button', { name: 'GitHub User 用户菜单' }));

    expect(screen.getByText('GitHub 登录')).toBeInTheDocument();
  });

  it('signs out and returns to / on logout', async () => {
    const signOutSpy = vi.fn(async () => {
      useAuthStore.setState({ status: 'guest', session: null, profile: null });
    });
    useAuthStore.setState({
      status: 'authenticated',
      session: {
        userId: 'principal-3',
        email: 'user@example.com',
        provider: 'email',
        expiresAt: Date.now() + 3600_000,
      },
      profile: {
        principalId: 'principal-3',
        email: 'user@example.com',
        displayName: 'User',
        avatarUrl: null,
        locale: 'zh-CN',
        securityVersion: 1,
        identities: [],
      },
      signOut: signOutSpy,
    });
    renderMenu();

    await userEvent.click(screen.getByRole('button', { name: 'User 用户菜单' }));
    const logout = screen.getByRole('button', { name: '退出登录' });
    expect(logout).not.toBeDisabled();
    await userEvent.click(logout);

    expect(signOutSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('current-path')).toHaveTextContent('/');
    expect(useAuthStore.getState().session).toBeNull();
  });
});
