import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDemoAuthStore } from '@/presentation/stores/demo-auth-store';
import type {
  DemoAuthResult,
  DemoAuthSession,
  DemoRegistrationResult,
  DemoRecoveryResult,
} from '@/presentation/screens/auth/auth-types';
import type { DemoSignInInput } from '@/presentation/screens/auth/auth-types';

import { AuthDialog } from './auth-dialog';

function resetStore(): void {
  useDemoAuthStore.setState({ session: null, operation: null, error: null });
}

interface DialogHandlers {
  onOpenChange: ReturnType<typeof vi.fn>;
  onNavigateLogin: ReturnType<typeof vi.fn>;
  onNavigateSignup: ReturnType<typeof vi.fn>;
  onAuthenticated: ReturnType<typeof vi.fn>;
}

function renderDialog(
  overrides: Partial<React.ComponentProps<typeof AuthDialog>> = {}
): DialogHandlers {
  const onOpenChange = vi.fn();
  const onNavigateLogin = vi.fn();
  const onNavigateSignup = vi.fn();
  const onAuthenticated = vi.fn();
  render(
    <AuthDialog
      open
      routeMode="login"
      onOpenChange={onOpenChange}
      onNavigateLogin={onNavigateLogin}
      onNavigateSignup={onNavigateSignup}
      onAuthenticated={onAuthenticated}
      {...overrides}
    />
  );
  return { onOpenChange, onNavigateLogin, onNavigateSignup, onAuthenticated };
}

describe('AuthDialog structure', () => {
  beforeEach(() => {
    resetStore();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    resetStore();
  });

  it('renders a modal dialog with dynamic title and description for login', () => {
    renderDialog({ routeMode: 'login' });

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby');
    expect(dialog).toHaveAttribute('aria-describedby');

    expect(screen.getByText('欢迎回来')).toBeInTheDocument();
    expect(
      screen.getByText('继续推进目标，把今天的进展提交掉。')
    ).toBeInTheDocument();
  });

  it('renders the brand, branch visual and trust note', () => {
    renderDialog({ routeMode: 'login' });

    expect(screen.getByText('CommitToDo')).toBeInTheDocument();
    expect(document.querySelector('svg.auth-branch')).toBeInTheDocument();
    expect(screen.getByText(/本地优先 · 数据保存在本机/)).toBeInTheDocument();
  });

  it('marks the login tab selected and the signup tab not selected', () => {
    renderDialog({ routeMode: 'login' });

    const loginTab = screen.getByRole('tab', { name: '登录' });
    const signupTab = screen.getByRole('tab', { name: '注册' });
    expect(loginTab).toHaveAttribute('aria-selected', 'true');
    expect(signupTab).toHaveAttribute('aria-selected', 'false');
  });

  it('renders the signup title and form when routeMode is signup', () => {
    renderDialog({ routeMode: 'signup' });

    expect(screen.getByText('创建你的工作区')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '创建账户' })).toBeInTheDocument();
  });

  it('calls onOpenChange(false) when the close button is clicked', async () => {
    const { onOpenChange } = renderDialog();

    await userEvent.click(screen.getByRole('button', { name: '关闭登录与注册' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls onNavigateSignup when the signup tab is clicked', async () => {
    const { onNavigateSignup } = renderDialog({ routeMode: 'login' });

    await userEvent.click(screen.getByRole('tab', { name: '注册' }));

    expect(onNavigateSignup).toHaveBeenCalledTimes(1);
  });

  it('calls onNavigateLogin when switching from signup to the login tab', async () => {
    const { onNavigateLogin } = renderDialog({ routeMode: 'signup' });

    await userEvent.click(screen.getByRole('tab', { name: '登录' }));

    expect(onNavigateLogin).toHaveBeenCalledTimes(1);
  });

  it('switches to the forgot-password view within the same dialog', async () => {
    renderDialog({ routeMode: 'login' });

    await userEvent.click(screen.getByRole('button', { name: '忘记密码' }));

    expect(screen.getByText('找回演示账号')).toBeInTheDocument();
    expect(screen.getByText(/admin \/ admin/)).toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('focuses the username input on open', () => {
    renderDialog({ routeMode: 'login' });

    expect(screen.getByPlaceholderText('输入账号')).toHaveFocus();
  });

  it('defaults remember-me to checked and allows toggling', async () => {
    renderDialog({ routeMode: 'login' });

    const remember = screen.getByRole('checkbox', { name: '记住我' });
    expect(remember).toBeChecked();

    await userEvent.click(remember);
    expect(remember).not.toBeChecked();
  });

  it('toggles password visibility', async () => {
    renderDialog({ routeMode: 'login' });

    const password = screen.getByPlaceholderText('输入密码');
    expect(password).toHaveAttribute('type', 'password');

    await userEvent.click(screen.getByRole('button', { name: '显示密码' }));
    expect(password).toHaveAttribute('type', 'text');

    await userEvent.click(screen.getByRole('button', { name: '隐藏密码' }));
    expect(password).toHaveAttribute('type', 'password');
  });

  it('uses stable v3 classes for the overlay, content and branch visual', () => {
    renderDialog({ routeMode: 'login' });

    expect(document.querySelector('.auth-overlay')).toBeInTheDocument();
    expect(document.querySelector('.auth-content')).toBeInTheDocument();
    expect(document.querySelector('svg.auth-branch')).toBeInTheDocument();
  });
});

describe('AuthDialog login behavior', () => {
  beforeEach(() => {
    resetStore();
    localStorage.clear();
    sessionStorage.clear();
    // Replace the store actions with synchronous-ish implementations that
    // defer the result state update to a microtask (after handleSubmit's
    // `await`). This mirrors the real async flow while keeping every store
    // update inside the test's act-wrapped flush. The real store's 450ms timer
    // behavior is covered by demo-auth-store.test.ts.
    useDemoAuthStore.setState({
      signIn: async (input: DemoSignInInput): Promise<DemoAuthResult> => {
        useDemoAuthStore.setState({ operation: 'login', error: null });
        await Promise.resolve();
        const username = input.username.trim();
        if (username !== 'admin' || input.password !== 'admin') {
          useDemoAuthStore.setState({
            error: 'invalid-credentials',
            operation: null,
          });
          return { ok: false, code: 'invalid-credentials' };
        }
        const session: DemoAuthSession = {
          version: 1,
          user: {
            username: 'admin',
            provider: 'credentials',
            signedInAt: new Date().toISOString(),
          },
          persistence: input.remember ? 'local' : 'session',
        };
        useDemoAuthStore.setState({ session, operation: null });
        return { ok: true, session };
      },
      signInWithGithub: async (remember: boolean): Promise<DemoAuthResult> => {
        useDemoAuthStore.setState({ operation: 'github', error: null });
        await Promise.resolve();
        const session: DemoAuthSession = {
          version: 1,
          user: {
            username: 'admin',
            provider: 'github',
            signedInAt: new Date().toISOString(),
          },
          persistence: remember ? 'local' : 'session',
        };
        useDemoAuthStore.setState({ session, operation: null });
        return { ok: true, session };
      },
      simulateRegistration: async (): Promise<DemoRegistrationResult> => {
        useDemoAuthStore.setState({ operation: 'signup', error: null });
        await Promise.resolve();
        useDemoAuthStore.setState({ operation: null });
        return { ok: true, suggestedUsername: 'admin' };
      },
      simulateRecovery: async (): Promise<DemoRecoveryResult> => {
        useDemoAuthStore.setState({ operation: 'recovery', error: null });
        await Promise.resolve();
        useDemoAuthStore.setState({ operation: null });
        return { ok: true, suggestedUsername: 'admin' };
      },
      clearError: () => useDemoAuthStore.setState({ error: null }),
    });
  });

  afterEach(() => {
    resetStore();
  });

  const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

  function typeInto(label: RegExp, value: string): void {
    fireEvent.input(screen.getByPlaceholderText(label), {
      target: { value },
    });
  }

  it('shows field errors and does not navigate on empty submit', () => {
    const { onAuthenticated } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: '登录' }));

    expect(screen.getByText('请输入账号')).toBeInTheDocument();
    expect(screen.getByText('请输入密码')).toBeInTheDocument();
    expect(onAuthenticated).not.toHaveBeenCalled();
  });

  it('shows a credential error for wrong creds and stays on the dialog', async () => {
    const { onAuthenticated } = renderDialog();

    typeInto(/输入账号/, 'wrong');
    typeInto(/输入密码/, 'wrong');
    fireEvent.click(screen.getByRole('button', { name: '登录' }));

    expect(
      await screen.findByText('账号或密码不正确，请使用 admin / admin')
    ).toBeInTheDocument();
    // Drain lingering microtasks/timers (Radix focus handling) inside act.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(onAuthenticated).not.toHaveBeenCalled();
  });

  it('logs in with admin/admin and calls onAuthenticated', async () => {
    const { onAuthenticated } = renderDialog();

    typeInto(/输入账号/, 'admin');
    typeInto(/输入密码/, 'admin');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '登录' }));
      await Promise.resolve();
      await Promise.resolve();
      // Success-feedback timer before onAuthenticated.
      await sleep(400);
    });

    expect(onAuthenticated).toHaveBeenCalledTimes(1);
    expect(useDemoAuthStore.getState().session?.user.username).toBe('admin');
  });

  it('clears the credential error when the username changes', async () => {
    renderDialog();

    typeInto(/输入账号/, 'wrong');
    typeInto(/输入密码/, 'wrong');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '登录' }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      screen.getByText('账号或密码不正确，请使用 admin / admin')
    ).toBeInTheDocument();

    typeInto(/输入账号/, 'wrongx');

    expect(
      screen.queryByText('账号或密码不正确，请使用 admin / admin')
    ).not.toBeInTheDocument();
  });
});

function TestAuthDialog({
  initialMode = 'login',
  onAuthenticated,
}: {
  initialMode?: 'login' | 'signup';
  onAuthenticated?: () => void;
}): JSX.Element {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  return (
    <AuthDialog
      open
      routeMode={mode}
      onOpenChange={vi.fn()}
      onNavigateLogin={() => setMode('login')}
      onNavigateSignup={() => setMode('signup')}
      onAuthenticated={onAuthenticated ?? vi.fn()}
    />
  );
}

function makeGithubSession(): DemoAuthSession {
  return {
    version: 1,
    user: {
      username: 'admin',
      provider: 'github',
      signedInAt: '2026-07-14T00:00:00.000Z',
    },
    persistence: 'local',
  };
}

function makeCredentialsSession(): DemoAuthSession {
  return {
    version: 1,
    user: {
      username: 'admin',
      provider: 'credentials',
      signedInAt: '2026-07-14T00:00:00.000Z',
    },
    persistence: 'local',
  };
}

describe('AuthDialog signup, recovery and github flows', () => {
  const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

  function typeInto(label: RegExp, value: string): void {
    fireEvent.input(screen.getByPlaceholderText(label), {
      target: { value },
    });
  }

  beforeEach(() => {
    resetStore();
    localStorage.clear();
    sessionStorage.clear();
    useDemoAuthStore.setState({
      signIn: async (input: DemoSignInInput): Promise<DemoAuthResult> => {
        await Promise.resolve();
        const username = input.username.trim();
        if (username !== 'admin' || input.password !== 'admin') {
          return { ok: false, code: 'invalid-credentials' };
        }
        const session = makeCredentialsSession();
        return { ok: true, session };
      },
      signInWithGithub: async (): Promise<DemoAuthResult> => {
        await Promise.resolve();
        const session = makeGithubSession();
        useDemoAuthStore.setState({ session });
        return { ok: true, session };
      },
      simulateRegistration: async (): Promise<DemoRegistrationResult> => {
        await Promise.resolve();
        return { ok: true, suggestedUsername: 'admin' };
      },
      simulateRecovery: async (): Promise<DemoRecoveryResult> => {
        await Promise.resolve();
        return { ok: true, suggestedUsername: 'admin' };
      },
      clearError: () => useDemoAuthStore.setState({ error: null }),
    });
  });

  afterEach(() => {
    resetStore();
  });

  it('shows signup required errors on empty submit', () => {
    render(<TestAuthDialog initialMode="signup" />);

    fireEvent.click(screen.getByRole('button', { name: '创建账户' }));

    expect(screen.getByText('请输入账号')).toBeInTheDocument();
    expect(screen.getByText('请输入密码')).toBeInTheDocument();
    expect(screen.getByText('请确认密码')).toBeInTheDocument();
    expect(
      screen.getByText('请阅读并同意服务条款与隐私政策')
    ).toBeInTheDocument();
  });

  it('completes signup, switches to login with admin preset and notice', async () => {
    render(<TestAuthDialog initialMode="signup" />);

    typeInto(/输入账号/, 'someone');
    typeInto(/至少 5 个字符/, 'secret');
    typeInto(/再次输入密码/, 'secret');
    fireEvent.click(screen.getByRole('checkbox'));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '创建账户' }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText('欢迎回来')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('输入账号')).toHaveValue('admin');
    expect(
      screen.getByText('演示注册完成，请使用 admin / admin 登录')
    ).toBeInTheDocument();
  });

  it('recovers the demo account and returns to login with a notice', async () => {
    render(<TestAuthDialog initialMode="login" />);

    await userEvent.click(screen.getByRole('button', { name: '忘记密码' }));
    expect(screen.getByText('找回演示账号')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '恢复演示账号' }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText('欢迎回来')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('输入账号')).toHaveValue('admin');
    expect(screen.getByText('演示密码已恢复为 admin')).toBeInTheDocument();
  });

  it('signs in with GitHub and calls onAuthenticated', async () => {
    const onAuthenticated = vi.fn();
    render(<TestAuthDialog initialMode="login" onAuthenticated={onAuthenticated} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '使用 GitHub 继续' }));
      await Promise.resolve();
      await Promise.resolve();
      await sleep(400);
    });

    expect(onAuthenticated).toHaveBeenCalledTimes(1);
    expect(useDemoAuthStore.getState().session?.user.provider).toBe('github');
  });

  it('still authenticates when storage is unavailable', async () => {
    const onAuthenticated = vi.fn();
    useDemoAuthStore.setState({
      signIn: async (): Promise<DemoAuthResult> => {
        await Promise.resolve();
        return {
          ok: true,
          session: makeCredentialsSession(),
          warning: 'storage-unavailable',
        };
      },
    });

    render(<TestAuthDialog initialMode="login" onAuthenticated={onAuthenticated} />);

    typeInto(/输入账号/, 'admin');
    typeInto(/输入密码/, 'admin');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '登录' }));
      await Promise.resolve();
      await Promise.resolve();
      await sleep(400);
    });

    expect(onAuthenticated).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText('已登录，但当前会话无法持久保存')
    ).toBeInTheDocument();
  });
});
