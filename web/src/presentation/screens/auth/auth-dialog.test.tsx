import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/presentation/stores/auth-store';

import { AuthDialog } from './auth-dialog';

function resetStore(): void {
  useAuthStore.setState({
    status: 'guest',
    session: null,
    profile: null,
    operation: null,
    error: null,
  });
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

    expect(screen.getByText('重置密码')).toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('focuses the email input on open', () => {
    renderDialog({ routeMode: 'login' });

    expect(screen.getByPlaceholderText('name@example.com')).toHaveFocus();
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
    useAuthStore.setState({
      signInWithEmail: async (_email: string, _password: string): Promise<boolean> => {
        useAuthStore.setState({ operation: 'login-email', error: null });
        await Promise.resolve();
        useAuthStore.setState({
          status: 'authenticated',
          session: {
            userId: 'principal-1',
            email: _email,
            provider: 'email',
            expiresAt: Date.now() + 3600_000,
          },
          operation: null,
        });
        return true;
      },
      clearError: () => useAuthStore.setState({ error: null }),
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

    expect(screen.getByText('请输入邮箱')).toBeInTheDocument();
    expect(screen.getByText('请输入密码')).toBeInTheDocument();
    expect(onAuthenticated).not.toHaveBeenCalled();
  });

  it('shows a credential error for wrong creds and stays on the dialog', async () => {
    useAuthStore.setState({
      signInWithEmail: async (): Promise<boolean> => {
        useAuthStore.setState({ error: 'Invalid login credentials', operation: null });
        return false;
      },
    });
    const { onAuthenticated } = renderDialog();

    typeInto(/name@example\.com/, 'wrong@example.com');
    typeInto(/输入密码/, 'wrong');
    fireEvent.click(screen.getByRole('button', { name: '登录' }));

    expect(
      await screen.findByText('邮箱或密码不正确，请重试。')
    ).toBeInTheDocument();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(onAuthenticated).not.toHaveBeenCalled();
  });

  it('logs in with valid email/password and calls onAuthenticated', async () => {
    const { onAuthenticated } = renderDialog();

    typeInto(/name@example\.com/, 'user@example.com');
    typeInto(/输入密码/, 'password123');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '登录' }));
      await Promise.resolve();
      await Promise.resolve();
      await sleep(400);
    });

    expect(onAuthenticated).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().session?.userId).toBe('principal-1');
  });

  it('clears the credential error when the email changes', async () => {
    useAuthStore.setState({
      signInWithEmail: async (): Promise<boolean> => {
        useAuthStore.setState({ error: 'Invalid login credentials', operation: null });
        return false;
      },
    });
    renderDialog();

    typeInto(/name@example\.com/, 'wrong@example.com');
    typeInto(/输入密码/, 'wrong');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '登录' }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      screen.getByText('邮箱或密码不正确，请重试。')
    ).toBeInTheDocument();

    typeInto(/name@example\.com/, 'wrong2@example.com');

    expect(
      screen.queryByText('邮箱或密码不正确，请重试。')
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

describe('AuthDialog signup and recovery flows', () => {
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
    useAuthStore.setState({
      signInWithEmail: async (): Promise<boolean> => {
        await Promise.resolve();
        return true;
      },
      signUpWithEmail: async (): Promise<{ verificationId: string } | null> => {
        useAuthStore.setState({ operation: 'signup-email', error: null });
        await Promise.resolve();
        useAuthStore.setState({ operation: null });
        return { verificationId: 'verify-123' };
      },
      verifyEmailOtp: async (): Promise<boolean> => {
        useAuthStore.setState({ operation: 'verify-otp', error: null });
        await Promise.resolve();
        useAuthStore.setState({
          status: 'authenticated',
          session: {
            userId: 'principal-new',
            email: 'new@example.com',
            provider: 'email',
            expiresAt: Date.now() + 3600_000,
          },
          operation: null,
        });
        return true;
      },
      requestPasswordReset: async (): Promise<boolean> => true,
      completePasswordReset: async (
        email: string
      ): Promise<boolean> => {
        useAuthStore.setState({
          status: 'authenticated',
          session: {
            userId: 'principal-recovered',
            email,
            provider: 'email',
          },
          operation: null,
        });
        return true;
      },
      clearError: () => useAuthStore.setState({ error: null }),
    });
  });

  afterEach(() => {
    resetStore();
  });

  it('shows signup required errors on empty submit', () => {
    render(<TestAuthDialog initialMode="signup" />);

    fireEvent.click(screen.getByRole('button', { name: '创建账户' }));

    expect(screen.getByText('请输入邮箱')).toBeInTheDocument();
    expect(screen.getByText('请输入密码')).toBeInTheDocument();
    expect(screen.getByText('请确认密码')).toBeInTheDocument();
    expect(
      screen.getByText('请阅读并同意服务条款与隐私政策')
    ).toBeInTheDocument();
  });

  it('completes signup and switches to OTP verification', async () => {
    render(<TestAuthDialog initialMode="signup" />);

    typeInto(/name@example\.com/, 'new@example.com');
    typeInto(/至少 12 个字符/, 'password12345');
    typeInto(/再次输入密码/, 'password12345');
    fireEvent.click(screen.getByRole('checkbox'));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '创建账户' }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText('验证邮箱')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('6 位数字')).toBeInTheDocument();
  });

  it('verifies OTP and calls onAuthenticated', async () => {
    const onAuthenticated = vi.fn();
    render(<TestAuthDialog initialMode="signup" onAuthenticated={onAuthenticated} />);

    typeInto(/name@example\.com/, 'new@example.com');
    typeInto(/至少 12 个字符/, 'password12345');
    typeInto(/再次输入密码/, 'password12345');
    fireEvent.click(screen.getByRole('checkbox'));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '创建账户' }));
      await Promise.resolve();
      await Promise.resolve();
    });

    fireEvent.input(screen.getByPlaceholderText('6 位数字'), {
      target: { value: '123456' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '验证并登录' }));
      await Promise.resolve();
      await Promise.resolve();
      await sleep(400);
    });

    expect(onAuthenticated).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().session?.userId).toBe('principal-new');
  });

  it('recovers the account with an email code and a new password', async () => {
    const onAuthenticated = vi.fn();
    render(<TestAuthDialog initialMode="login" onAuthenticated={onAuthenticated} />);

    await userEvent.click(screen.getByRole('button', { name: '忘记密码' }));
    expect(screen.getByText('重置密码')).toBeInTheDocument();

    fireEvent.input(screen.getByPlaceholderText('name@example.com'), {
      target: { value: 'user@example.com' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '发送验证码' }));
      await Promise.resolve();
    });

    expect(screen.getByText(/验证码已发送/)).toBeInTheDocument();
    typeInto(/6 位数字/, '123456');
    typeInto(/至少 12 个字符/, 'new-password-123');
    typeInto(/再次输入新密码/, 'new-password-123');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '更新密码' }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onAuthenticated).toHaveBeenCalledOnce();
    expect(useAuthStore.getState().session?.userId).toBe('principal-recovered');
  });
});
