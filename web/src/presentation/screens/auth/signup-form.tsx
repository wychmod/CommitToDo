import { Eye, EyeOff, Lock, User } from 'lucide-react';
import * as React from 'react';

import type {
  AuthOperation,
  DemoRegistrationResult,
  SignupFormValues,
} from './auth-types';
import { firstSignupErrorField, validateSignupForm } from './auth-validation';
import { AuthField } from './auth-field';

const SIGNUP_LOADING = '正在创建演示账户…';

export interface SignupFormProps {
  operation: AuthOperation;
  onSubmit(values: SignupFormValues): Promise<DemoRegistrationResult>;
  onCompleted(username: 'admin'): void;
  onNavigateLogin(): void;
}

export function SignupForm({
  operation,
  onSubmit,
  onCompleted,
  onNavigateLogin,
}: SignupFormProps): JSX.Element {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [errors, setErrors] = React.useState<{
    username?: string;
    password?: string;
    confirmPassword?: string;
    acceptedTerms?: string;
  }>({});

  const usernameRef = React.useRef<HTMLInputElement>(null);
  const passwordRef = React.useRef<HTMLInputElement>(null);
  const confirmRef = React.useRef<HTMLInputElement>(null);
  const termsRef = React.useRef<HTMLInputElement>(null);

  const isBusy = operation === 'signup';

  const focusField = (
    field: 'username' | 'password' | 'confirmPassword' | 'acceptedTerms'
  ): void => {
    if (field === 'username') usernameRef.current?.focus();
    else if (field === 'password') passwordRef.current?.focus();
    else if (field === 'confirmPassword') confirmRef.current?.focus();
    else termsRef.current?.focus();
  };

  const clearFieldError = (
    field: 'username' | 'password' | 'confirmPassword' | 'acceptedTerms'
  ): void => {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (isBusy) return;

    const values: SignupFormValues = {
      username,
      password,
      confirmPassword,
      acceptedTerms,
    };
    const validationErrors = validateSignupForm(values);
    setErrors(validationErrors);
    const firstField = firstSignupErrorField(validationErrors);
    if (firstField) {
      focusField(firstField);
      return;
    }

    await onSubmit(values);
    // No real account is created; clear secrets before the dialog swaps views.
    setPassword('');
    setConfirmPassword('');
    onCompleted('admin');
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <AuthField
        id="signup-username"
        label="账号"
        icon={User}
        placeholder="输入账号"
        autoComplete="username"
        name="username"
        value={username}
        onChange={(e) => {
          setUsername(e.target.value);
          clearFieldError('username');
        }}
        error={errors.username}
        ref={usernameRef}
        disabled={isBusy}
      />

      <AuthField
        id="signup-password"
        label="密码"
        icon={Lock}
        placeholder="至少 5 个字符"
        autoComplete="new-password"
        name="password"
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          clearFieldError('password');
        }}
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

      <AuthField
        id="signup-confirm"
        label="确认密码"
        icon={Lock}
        placeholder="再次输入密码"
        autoComplete="new-password"
        name="confirmPassword"
        type={showConfirm ? 'text' : 'password'}
        value={confirmPassword}
        onChange={(e) => {
          setConfirmPassword(e.target.value);
          clearFieldError('confirmPassword');
        }}
        error={errors.confirmPassword}
        ref={confirmRef}
        disabled={isBusy}
        trailingAction={
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            aria-label={showConfirm ? '隐藏密码' : '显示密码'}
            disabled={isBusy}
            className="flex h-10 w-10 items-center justify-center rounded-[var(--v3-radius-sm)] text-[var(--v3-text-muted)] transition-colors hover:text-[var(--v3-text-strong)] disabled:opacity-50"
          >
            {showConfirm ? (
              <EyeOff size={16} strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <Eye size={16} strokeWidth={1.5} aria-hidden="true" />
            )}
          </button>
        }
      />

      <div className="flex items-start gap-2">
        <input
          ref={termsRef}
          id="signup-terms"
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => {
            setAcceptedTerms(e.target.checked);
            clearFieldError('acceptedTerms');
          }}
          disabled={isBusy}
          aria-invalid={errors.acceptedTerms ? true : undefined}
          aria-describedby={errors.acceptedTerms ? 'signup-terms-error' : undefined}
          className="mt-0.5 h-4 w-4 accent-[var(--v3-primary)]"
        />
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-[var(--v3-text-secondary)]">
            <label htmlFor="signup-terms" className="cursor-pointer">
              我已阅读并同意
            </label>{' '}
            <button
              type="button"
              className="font-medium text-[var(--v3-text)] underline decoration-dotted underline-offset-2 transition-colors hover:text-[var(--v3-primary)]"
            >
              服务条款
            </button>{' '}
            和{' '}
            <button
              type="button"
              className="font-medium text-[var(--v3-text)] underline decoration-dotted underline-offset-2 transition-colors hover:text-[var(--v3-primary)]"
            >
              隐私政策
            </button>
          </span>
          {errors.acceptedTerms ? (
            <p
              id="signup-terms-error"
              aria-live="polite"
              className="text-[12px] text-[var(--v3-danger)]"
            >
              {errors.acceptedTerms}
            </p>
          ) : null}
        </div>
      </div>

      <button
        type="submit"
        disabled={isBusy}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--v3-radius-md)] bg-[linear-gradient(180deg,var(--v3-primary-dim),var(--v3-primary))] text-[14px] font-semibold text-[var(--v3-text-on-primary)] transition-[filter,box-shadow,transform] duration-(--v3-fast) hover:-translate-y-px hover:[filter:brightness(1.06)] hover:[box-shadow:var(--v3-glow-primary)] disabled:pointer-events-none disabled:opacity-60"
      >
        {isBusy ? (
          <>
            <span className="auth-spinner" aria-hidden="true" />
            <span>{SIGNUP_LOADING}</span>
          </>
        ) : (
          <span>创建账户</span>
        )}
      </button>

      <p className="text-center text-[13px] text-[var(--v3-text-secondary)]">
        已有账户？
        <button
          type="button"
          onClick={onNavigateLogin}
          disabled={isBusy}
          className="ml-1 font-medium text-[var(--v3-primary)] transition-colors hover:underline disabled:opacity-50"
        >
          返回登录
        </button>
      </p>
    </form>
  );
}
