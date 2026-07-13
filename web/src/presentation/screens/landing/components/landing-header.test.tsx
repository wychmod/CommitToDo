import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useDemoAuthStore } from '@/presentation/stores/demo-auth-store';
import { LandingHeader } from './landing-header';

function renderWithRouter(ui: React.ReactElement): ReturnType<typeof render> {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

function resetStore(): void {
  useDemoAuthStore.setState({ session: null, operation: null, error: null });
}

describe('LandingHeader', () => {
  beforeEach(() => {
    resetStore();
  });

  afterEach(() => {
    resetStore();
  });

  it('renders the brand', () => {
    renderWithRouter(<LandingHeader />);

    expect(screen.getByText('CommitToDo')).toBeInTheDocument();
  });

  it('renders the primary navigation links', () => {
    renderWithRouter(<LandingHeader />);

    expect(screen.getByText('功能')).toBeInTheDocument();
    expect(screen.getByText('定价')).toBeInTheDocument();
    expect(screen.getByText('文档')).toBeInTheDocument();
    expect(screen.getByText('更新日志')).toBeInTheDocument();
  });

  it('renders the technical status tag', () => {
    renderWithRouter(<LandingHeader />);

    expect(
      screen.getByText('Local-first • PWA • IndexedDB')
    ).toBeInTheDocument();
  });

  it('points the guest login link to /login and get-started to /workspace', () => {
    renderWithRouter(<LandingHeader />);

    const login = screen.getByText('登录');
    expect(login).toHaveAttribute('href', '/login');
    expect(login).toHaveAttribute('id', 'landing-login-trigger');

    const start = screen.getByText('开始使用');
    expect(start).toHaveAttribute('href', '/workspace');
  });

  it('shows the workspace entry instead of login for authenticated visitors', () => {
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

    renderWithRouter(<LandingHeader />);

    expect(screen.getByText('工作台')).toHaveAttribute('href', '/workspace');
    expect(screen.queryByText('登录')).not.toBeInTheDocument();
  });

  it('renders the theme toggle button', () => {
    renderWithRouter(<LandingHeader />);

    expect(
      screen.getByRole('button', { name: /切换到.*模式/ })
    ).toBeInTheDocument();
  });

  it('applies backdrop blur only after scrolling', () => {
    const { container } = renderWithRouter(<LandingHeader />);
    const header = container.querySelector('header');
    expect(header).toBeInTheDocument();

    expect(header).not.toHaveClass('backdrop-blur-[8px]');

    Object.defineProperty(window, 'scrollY', {
      value: 100,
      configurable: true,
    });
    fireEvent.scroll(window);

    expect(header).toHaveClass('backdrop-blur-[8px]');

    Object.defineProperty(window, 'scrollY', {
      value: 0,
      configurable: true,
    });
    fireEvent.scroll(window);

    expect(header).not.toHaveClass('backdrop-blur-[8px]');
  });
});
