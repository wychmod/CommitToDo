import { Check, Eye, EyeOff, Github, Lock, Mail } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/core/utils/formatters';
import type { AuthErrorCode, AuthOperation } from './auth-types';
import { firstLoginErrorField, validateLoginForm } from './auth-validation';
import { AuthField } from './auth-field';

const SUCCESS_FEEDBACK_MS = 320;
const LOGIN_LOADING = '正在登录…';
const LOGIN_SUCCESS = '登录成功';
const GITHUB_SUCCESS = 'GitHub 登录成功';
const GITHUB_LOADING = '正在跳转至 GitHub…';

export interface LoginFormProps {
  emailPreset?: string;
  operation: AuthOperation;
  authError: AuthErrorCode;
  notice?: string;
  githubEnabled: boolean;
  onSubmit(email: string, password: string): Promise<boolean>;
  onGithub(): Promise<void>;
  onForgotPassword(): void;
  onNavigateSignup(): void;
  onAuthenticated(): void;
  onClearAuthError(): void;
}

export function LoginForm({
  emailPreset,
  operation,
  authError,
  notice,
  githubEnabled,
  onSubmit,
  onGithub,
  onForgotPassword,
  onNavigateSignup,
  onAuthenticated,
  onClearAuthError,
}: LoginFormProps): JSX.Element {
  const [email, setEmail] = React.useState(emailPreset ?? '');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [errors, setErrors] = React.useState<{ email?: string; password?: string }>({});
  const [successLabel, setSuccessLabel] = React.useState<string | null>(null);

  const emailRef = React.useRef<HTMLInputElement>(null);
  const passwordRef = React.useRef<HTMLInputElement>(null);
  const successTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    setEmail(emailPreset ?? '');
  }, [emailPreset]);

  React.useEffect(() => {
    return () => {
      if (successTimer.current !== null) {
        window.clearTimeout(successTimer.current);
      }
    };
  }, []);

  const isLoginLoading = operation === 'login-email';
  const isGithubLoading = operation === 'github';
  const isBusy = isLoginLoading || isGithubLoading || successLabel !== null;

  const focusField = (field: 'email' | 'password'): void => {
    if (field === 'email') emailRef.current?.focus();
    else passwordRef.current?.focus();
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setEmail(e.target.value);
    setErrors((prev) => (prev.email ? { ...prev, email: undefined } : prev));
    if (authError) onClearAuthError();
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setPassword(e.target.value);
    setErrors((prev) => (prev.password ? { ...prev, password: undefined } : prev));
    if (authError) onClearAuthError();
  };

  const finishWithSuccess = (label: string): void => {
    setSuccessLabel(label);
    successTimer.current = window.setTimeout(() => {
      onAuthenticated();
    }, SUCCESS_FEEDBACK_MS);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (isBusy) return;

    const validationErrors = validateLoginForm({ email, password });
    setErrors(validationErrors);
    const firstField = firstLoginErrorField(validationErrors);
    if (firstField) {
      focusField(firstField);
      return;
    }

    const ok = await onSubmit(email.trim(), password);
    if (!ok) {
      focusField('email');
      return;
    }
    finishWithSuccess(LOGIN_SUCCESS);
  };

  const handleGithub = async (): Promise<void> => {
    if (isBusy) return;
    setSuccessLabel(GITHUB_LOADING);
    await onGithub();
  };

  const serverErrorMessage = mapAuthErrorToMessage(authError);

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      {notice ? (
        <p
          role="status"
          aria-live="polite"
          className="rounded-[var(--v3-radius-md)] border border-[var(--v3-primary-soft)] bg-[var(--v3-primary-soft)] px-3 py-2 text-[12px] text-[var(--v3-primary)]"
        >
          {notice}
        </p>
      ) : null}

      {serverErrorMessage ? (
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-[var(--v3-radius-md)] border border-[var(--v3-danger-soft)] bg-[var(--v3-danger-soft)] px-3 py-2 text-[12px] text-[var(--v3-danger)]"
        >
          {serverErrorMessage}
        </p>
      ) : null}

      <AuthField
        id="login-email"
        label="邮箱"
        icon={Mail}
        placeholder="name@example.com"
        autoComplete="email"
        name="email"
        type="email"
        value={email}
        onChange={handleEmailChange}
        error={errors.email}
        ref={emailRef}
        disabled={isBusy}
      />

      <AuthField
        id="login-password"
        label="密码"
        icon={Lock}
        placeholder="输入密码"
        autoComplete="current-password"
        name="password"
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={handlePasswordChange}
        error={errors.password}
        ref={passwordRef}
        disabled={isBusy}
        trailingAction={
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? '隐藏密码' : '显示密码'}
            disabled={isBusy}
            className="flex h-10 w-10 items-center justify-center rounded-[var(--v3-radius-sm)] text-[var(--v3-text-muted)] transition-colors hover:text-[var(--v3-text-strong)] disabled:opacity-50"
          >
            {showPassword ? (
              <EyeOff size={16} strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <Eye size={16} strokeWidth={1.5} aria-hidden="true" />
            )}
          </button>
        }
      />

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onForgotPassword}
          disabled={isBusy}
          className="text-[13px] text-[var(--v3-text-secondary)] transition-colors hover:text-[var(--v3-text-strong)] disabled:opacity-50"
        >
          忘记密码
        </button>
      </div>

      <button
        type="submit"
        disabled={isBusy}
        className={cn(
          'flex h-12 w-full items-center justify-center gap-2 rounded-[var(--v3-radius-md)] text-[14px] font-semibold transition-[filter,box-shadow,transform] duration-(--v3-fast)',
          successLabel === LOGIN_SUCCESS
            ? 'bg-[var(--v3-primary-soft)] text-[var(--v3-primary)]'
            : 'bg-[linear-gradient(180deg,var(--v3-primary-dim),var(--v3-primary))] text-[var(--v3-text-on-primary)] hover:-translate-y-px hover:[filter:brightness(1.06)] hover:[box-shadow:var(--v3-glow-primary)]',
          'disabled:pointer-events-none disabled:opacity-60'
        )}
      >
        {isLoginLoading ? (
          <>
            <span className="auth-spinner" aria-hidden="true" />
            <span>{LOGIN_LOADING}</span>
          </>
        ) : successLabel === LOGIN_SUCCESS ? (
          <>
            <Check size={16} strokeWidth={2} aria-hidden="true" />
            <span>{LOGIN_SUCCESS}</span>
          </>
        ) : (
          <span>登录</span>
        )}
      </button>

      {githubEnabled ? <div className="flex items-center gap-3" aria-hidden="true">
        <div className="h-px flex-1 bg-[var(--v3-divider)]" />
        <span className="text-[12px] text-[var(--v3-text-muted)]">或</span>
        <div className="h-px flex-1 bg-[var(--v3-divider)]" />
      </div> : null}

      {githubEnabled ? <button
        type="button"
        onClick={handleGithub}
        disabled={isBusy}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-control)] text-[14px] font-medium text-[var(--v3-text)] transition-[background-color,border-color] duration-(--v3-fast) hover:border-[var(--v3-border-hover)] disabled:pointer-events-none disabled:opacity-60"
      >
        {isGithubLoading ? (
          <>
            <span className="auth-spinner" aria-hidden="true" />
            <span>{GITHUB_LOADING}</span>
          </>
        ) : successLabel === GITHUB_SUCCESS ? (
          <>
            <Check size={16} strokeWidth={2} aria-hidden="true" />
            <span>{GITHUB_SUCCESS}</span>
          </>
        ) : (
          <>
            <Github size={16} strokeWidth={1.5} aria-hidden="true" />
            <span>使用 GitHub 继续</span>
          </>
        )}
      </button> : null}

      <p className="text-center text-[13px] text-[var(--v3-text-secondary)]">
        还没有账户？
        <button
          type="button"
          onClick={onNavigateSignup}
          disabled={isBusy}
          className="ml-1 font-medium text-[var(--v3-primary)] transition-colors hover:underline disabled:opacity-50"
        >
          创建账户
        </button>
      </p>
    </form>
  );
}

function mapAuthErrorToMessage(error: AuthErrorCode): string | null {
  switch (error) {
    case 'invalid-credentials':
      return '邮箱或密码不正确，请重试。';
    case 'email-already-in-use':
      return '该邮箱已被注册。';
    case 'rate-limited':
      return '操作过于频繁，请稍后再试。';
    case 'server-error':
      return '服务暂时不可用，请稍后重试。';
    default:
      return null;
  }
}
