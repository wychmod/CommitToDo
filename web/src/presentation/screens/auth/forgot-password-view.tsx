import { ArrowLeft, Mail } from 'lucide-react';
import * as React from 'react';

import { AuthField } from './auth-field';
import type { AuthOperation } from './auth-types';
import { validateRecoveryForm } from './auth-validation';

const RECOVERY_LOADING = '正在发送…';

export interface ForgotPasswordViewProps {
  operation: AuthOperation;
  serverError?: string | null;
  onRecover(email: string): Promise<boolean>;
  onComplete(email: string, code: string, password: string): Promise<boolean>;
  onBack(): void;
}

export function ForgotPasswordView({
  operation,
  serverError,
  onRecover,
  onComplete,
  onBack,
}: ForgotPasswordViewProps): JSX.Element {
  const [email, setEmail] = React.useState('');
  const [code, setCode] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [sent, setSent] = React.useState(false);
  const [completed, setCompleted] = React.useState(false);
  const emailRef = React.useRef<HTMLInputElement>(null);

  const isBusy = operation === 'recovery';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setEmail(e.target.value);
    if (error) setError(undefined);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (isBusy) return;

    const errors = validateRecoveryForm({ email });
    setError(errors.email);
    if (errors.email) {
      emailRef.current?.focus();
      return;
    }

    const ok = await onRecover(email.trim());
    if (ok) setSent(true);
  };

  const handleComplete = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (isBusy) return;
    if (!/^\d{6}$/.test(code)) {
      setError('请输入 6 位验证码。');
      return;
    }
    if (password.length < 12) {
      setError('密码至少需要 12 个字符。');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致。');
      return;
    }
    const ok = await onComplete(email.trim(), code, password);
    if (ok) setCompleted(true);
  };

  if (completed) {
    return (
      <div className="flex flex-col gap-5 text-center">
        <p className="text-[14px] text-[var(--v3-text-strong)]">
          密码已更新，正在进入你的工作区。
        </p>
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center gap-1.5 text-[13px] text-[var(--v3-text-secondary)] transition-colors hover:text-[var(--v3-text-strong)]"
        >
          <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" />
          <span>返回登录</span>
        </button>
      </div>
    );
  }

  if (sent) {
    return (
      <form className="flex flex-col gap-4" onSubmit={handleComplete} noValidate>
        <p className="text-[14px] text-[var(--v3-text-secondary)]">
          如果该邮箱已注册，验证码已发送至 <span className="font-medium">{email}</span>。
        </p>
        <label className="flex flex-col gap-1.5 text-[13px] text-[var(--v3-text-secondary)]">
          验证码
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
              setError(undefined);
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6 位数字"
            className="h-11 rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg)] px-3 text-[14px] text-[var(--v3-text-strong)] outline-none focus:border-[var(--v3-primary)]"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] text-[var(--v3-text-secondary)]">
          新密码
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(undefined);
            }}
            autoComplete="new-password"
            placeholder="至少 12 个字符"
            className="h-11 rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg)] px-3 text-[14px] text-[var(--v3-text-strong)] outline-none focus:border-[var(--v3-primary)]"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] text-[var(--v3-text-secondary)]">
          确认新密码
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setError(undefined);
            }}
            autoComplete="new-password"
            placeholder="再次输入新密码"
            className="h-11 rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg)] px-3 text-[14px] text-[var(--v3-text-strong)] outline-none focus:border-[var(--v3-primary)]"
          />
        </label>
        {error || serverError ? (
          <p className="text-[13px] text-[var(--v3-danger)]" role="alert">
            {error ?? '验证码无效或已过期，请重新请求。'}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={isBusy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--v3-radius-md)] bg-[linear-gradient(180deg,var(--v3-primary-dim),var(--v3-primary))] text-[14px] font-semibold text-[var(--v3-text-on-primary)] disabled:pointer-events-none disabled:opacity-60"
        >
          {isBusy ? '正在更新…' : '更新密码'}
        </button>
        <button
          type="button"
          onClick={onBack}
          disabled={isBusy}
          className="text-[13px] text-[var(--v3-text-secondary)]"
        >
          返回登录
        </button>
      </form>
    );
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
      <AuthField
        id="recovery-email"
        label="注册邮箱"
        icon={Mail}
        placeholder="name@example.com"
        autoComplete="email"
        name="email"
        type="email"
        value={email}
        onChange={handleChange}
        error={error}
        ref={emailRef}
        disabled={isBusy}
      />

      <button
        type="submit"
        disabled={isBusy}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--v3-radius-md)] bg-[linear-gradient(180deg,var(--v3-primary-dim),var(--v3-primary))] text-[14px] font-semibold text-[var(--v3-text-on-primary)] transition-[filter,box-shadow,transform] duration-(--v3-fast) hover:-translate-y-px hover:[filter:brightness(1.06)] hover:[box-shadow:var(--v3-glow-primary)] disabled:pointer-events-none disabled:opacity-60"
      >
        {isBusy ? (
          <>
            <span className="auth-spinner" aria-hidden="true" />
            <span>{RECOVERY_LOADING}</span>
          </>
        ) : (
          <span>发送验证码</span>
        )}
      </button>

      {serverError ? (
        <p className="text-[13px] text-[var(--v3-danger)]" role="alert">
          暂时无法发送验证码，请稍后重试。
        </p>
      ) : null}

      <button
        type="button"
        onClick={onBack}
        disabled={isBusy}
        className="flex items-center justify-center gap-1.5 text-[13px] text-[var(--v3-text-secondary)] transition-colors hover:text-[var(--v3-text-strong)] disabled:opacity-50"
      >
        <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" />
        <span>返回登录</span>
      </button>
    </form>
  );
}
