import { Check, Eye, EyeOff, Github, Lock, User } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/core/utils/formatters';
import type {
  AuthErrorCode,
  AuthOperation,
  DemoAuthResult,
  LoginFormValues,
} from './auth-types';
import { firstLoginErrorField, validateLoginForm } from './auth-validation';
import { AuthField } from './auth-field';

const CREDENTIAL_ERROR = '账号或密码不正确，请使用 admin / admin';
const SUCCESS_FEEDBACK_MS = 320;
const LOGIN_SUCCESS = '登录成功';
const GITHUB_SUCCESS = 'GitHub 演示登录成功';
const GITHUB_LOADING = '正在模拟 GitHub 登录…';
const LOGIN_LOADING = '正在登录…';
const STORAGE_WARNING = '已登录，但当前会话无法持久保存';

export interface LoginFormProps {
  usernamePreset?: string;
  operation: AuthOperation;
  authError: AuthErrorCode;
  notice?: string;
  onSubmit(values: LoginFormValues): Promise<DemoAuthResult>;
  onGithub(remember: boolean): Promise<DemoAuthResult>;
  onForgotPassword(): void;
  onNavigateSignup(): void;
  onAuthenticated(): void;
  onClearAuthError(): void;
}

export function LoginForm({
  usernamePreset,
  operation,
  authError,
  notice,
  onSubmit,
  onGithub,
  onForgotPassword,
  onNavigateSignup,
  onAuthenticated,
  onClearAuthError,
}: LoginFormProps): JSX.Element {
  const [username, setUsername] = React.useState(usernamePreset ?? '');
  const [password, setPassword] = React.useState('');
  const [remember, setRemember] = React.useState(true);
  const [showPassword, setShowPassword] = React.useState(false);
  const [errors, setErrors] = React.useState<{ username?: string; password?: string }>({});
  const [successLabel, setSuccessLabel] = React.useState<string | null>(null);
  const [storageWarning, setStorageWarning] = React.useState(false);

  const usernameRef = React.useRef<HTMLInputElement>(null);
  const passwordRef = React.useRef<HTMLInputElement>(null);
  const successTimer = React.useRef<number | null>(null);

  // Preset (e.g. after registration/recovery) updates only the username.
  React.useEffect(() => {
    setUsername(usernamePreset ?? '');
  }, [usernamePreset]);

  // Never leave a pending navigation timer after unmount/close.
  React.useEffect(() => {
    return () => {
      if (successTimer.current !== null) {
        window.clearTimeout(successTimer.current);
      }
    };
  }, []);

  const isLoginLoading = operation === 'login';
  const isGithubLoading = operation === 'github';
  const isBusy = isLoginLoading || isGithubLoading || successLabel !== null;
  const showCredentialError = authError === 'invalid-credentials';

  const focusField = (field: 'username' | 'password'): void => {
    if (field === 'username') usernameRef.current?.focus();
    else passwordRef.current?.focus();
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setUsername(e.target.value);
    setErrors((prev) => (prev.username ? { ...prev, username: undefined } : prev));
    if (showCredentialError) onClearAuthError();
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setPassword(e.target.value);
    setErrors((prev) => (prev.password ? { ...prev, password: undefined } : prev));
    if (showCredentialError) onClearAuthError();
  };

  const finishWithSuccess = (label: string, navigate: () => void): void => {
    setSuccessLabel(label);
    successTimer.current = window.setTimeout(() => {
      navigate();
    }, SUCCESS_FEEDBACK_MS);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (isBusy) return;

    const validationErrors = validateLoginForm({ username, password, remember });
    setErrors(validationErrors);
    const firstField = firstLoginErrorField(validationErrors);
    if (firstField) {
      focusField(firstField);
      return;
    }

    const result = await onSubmit({ username, password, remember });
    if (!result.ok) {
      // Store surfaces authError -> rendered below; move focus to username.
      focusField('username');
      return;
    }
    if (result.warning === 'storage-unavailable') {
      setStorageWarning(true);
    }
    finishWithSuccess(LOGIN_SUCCESS, onAuthenticated);
  };

  const handleGithub = async (): Promise<void> => {
    if (isBusy) return;
    const result = await onGithub(remember);
    if (!result.ok) return;
    if (result.warning === 'storage-unavailable') {
      setStorageWarning(true);
    }
    finishWithSuccess(GITHUB_SUCCESS, onAuthenticated);
  };

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

      {showCredentialError ? (
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-[var(--v3-radius-md)] border border-[var(--v3-danger-soft)] bg-[var(--v3-danger-soft)] px-3 py-2 text-[12px] text-[var(--v3-danger)]"
        >
          {CREDENTIAL_ERROR}
        </p>
      ) : null}

      <AuthField
        id="login-username"
        label="账号"
        icon={User}
        placeholder="输入账号"
        autoComplete="username"
        name="username"
        value={username}
        onChange={handleUsernameChange}
        error={errors.username}
        ref={usernameRef}
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

      <div className="flex items-center justify-between">
        <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-[13px] text-[var(--v3-text-secondary)]">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            disabled={isBusy}
            className="h-4 w-4 accent-[var(--v3-primary)]"
          />
          记住我
        </label>
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

      {storageWarning ? (
        <p
          role="status"
          aria-live="polite"
          className="text-center text-[12px] text-[var(--v3-warning)]"
        >
          {STORAGE_WARNING}
        </p>
      ) : null}

      <div className="flex items-center gap-3" aria-hidden="true">
        <div className="h-px flex-1 bg-[var(--v3-divider)]" />
        <span className="text-[12px] text-[var(--v3-text-muted)]">或</span>
        <div className="h-px flex-1 bg-[var(--v3-divider)]" />
      </div>

      <button
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
      </button>

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
