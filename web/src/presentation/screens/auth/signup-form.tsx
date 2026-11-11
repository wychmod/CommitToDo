import { Eye, EyeOff, Github, Lock, Mail } from 'lucide-react';
import * as React from 'react';

import { AuthField } from './auth-field';
import type { AuthOperation } from './auth-types';
import { firstSignupErrorField, validateSignupForm } from './auth-validation';

const SIGNUP_LOADING = '正在创建账户…';

export interface SignupFormProps {
  operation: AuthOperation;
  githubEnabled: boolean;
  onSubmit(values: { email: string; password: string }): Promise<{ verificationId: string } | null>;
  onCompleted(email: string): void;
  onNavigateLogin(): void;
  onGithub(): Promise<void>;
}

export function SignupForm({
  operation,
  githubEnabled,
  onSubmit,
  onCompleted,
  onNavigateLogin,
  onGithub,
}: SignupFormProps): JSX.Element {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [errors, setErrors] = React.useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    acceptedTerms?: string;
  }>({});

  const emailRef = React.useRef<HTMLInputElement>(null);
  const passwordRef = React.useRef<HTMLInputElement>(null);
  const confirmRef = React.useRef<HTMLInputElement>(null);
  const termsRef = React.useRef<HTMLInputElement>(null);

  const isBusy = operation === 'signup-email' || operation === 'github';

  const focusField = (
    field: 'email' | 'password' | 'confirmPassword' | 'acceptedTerms'
  ): void => {
    if (field === 'email') emailRef.current?.focus();
    else if (field === 'password') passwordRef.current?.focus();
    else if (field === 'confirmPassword') confirmRef.current?.focus();
    else termsRef.current?.focus();
  };

  const clearFieldError = (
    field: 'email' | 'password' | 'confirmPassword' | 'acceptedTerms'
  ): void => {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (isBusy) return;

    const values = { email, password, confirmPassword, acceptedTerms };
    const validationErrors = validateSignupForm(values);
    setErrors(validationErrors);
    const firstField = firstSignupErrorField(validationErrors);
    if (firstField) {
      focusField(firstField);
      return;
    }

    const result = await onSubmit({ email: email.trim(), password });
    if (!result) return;

    setPassword('');
    setConfirmPassword('');
    onCompleted(email.trim());
  };

  const handleGithub = async (): Promise<void> => {
    if (!acceptedTerms) {
      setErrors((current) => ({
        ...current,
        acceptedTerms: '请阅读并同意服务条款与隐私政策',
      }));
      termsRef.current?.focus();
      return;
    }
    await onGithub();
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <AuthField
        id="signup-email"
        label="邮箱"
        icon={Mail}
        placeholder="name@example.com"
        autoComplete="email"
        name="email"
        type="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          clearFieldError('email');
        }}
        error={errors.email}
        ref={emailRef}
        disabled={isBusy}
      />

      <AuthField
        id="signup-password"
        label="密码"
        icon={Lock}
        placeholder="至少 12 个字符"
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

      {githubEnabled ? (
        <>
          <div className="flex items-center gap-3" aria-hidden="true">
            <div className="h-px flex-1 bg-[var(--v3-divider)]" />
            <span className="text-[12px] text-[var(--v3-text-muted)]">或</span>
            <div className="h-px flex-1 bg-[var(--v3-divider)]" />
          </div>
          <button
            type="button"
            onClick={() => void handleGithub()}
            disabled={isBusy}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-control)] text-[14px] font-medium text-[var(--v3-text)] transition-[background-color,border-color] duration-(--v3-fast) hover:border-[var(--v3-border-hover)] disabled:pointer-events-none disabled:opacity-60"
          >
            <Github size={16} strokeWidth={1.5} aria-hidden="true" />
            <span>{operation === 'github' ? '正在跳转至 GitHub…' : '使用 GitHub 继续'}</span>
          </button>
        </>
      ) : null}

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
