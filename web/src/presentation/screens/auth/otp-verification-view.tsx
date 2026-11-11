import { Mail } from 'lucide-react';
import * as React from 'react';

import { AuthField } from './auth-field';
import type { AuthOperation } from './auth-types';
import { validateOtpForm } from './auth-validation';

const VERIFY_LOADING = '正在验证…';
const RESEND_SECONDS = 60;

export interface OtpVerificationViewProps {
  email: string;
  operation: AuthOperation;
  serverError: string | null;
  onVerify(code: string): Promise<boolean>;
  onResend(email: string): Promise<void>;
  onCancel(): void;
}

export function OtpVerificationView({
  email,
  operation,
  serverError,
  onVerify,
  onResend,
  onCancel,
}: OtpVerificationViewProps): JSX.Element {
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [resendCountdown, setResendCountdown] = React.useState(0);
  const codeRef = React.useRef<HTMLInputElement>(null);

  const isBusy = operation === 'verify-otp';

  React.useEffect(() => {
    if (resendCountdown <= 0) return;
    const id = window.setInterval(() => {
      setResendCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendCountdown]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
    if (error) setError(undefined);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (isBusy) return;

    const errors = validateOtpForm({ code });
    setError(errors.code);
    if (errors.code) {
      codeRef.current?.focus();
      return;
    }

    await onVerify(code);
  };

  const handleResend = async (): Promise<void> => {
    if (resendCountdown > 0 || isBusy) return;
    setResendCountdown(RESEND_SECONDS);
    await onResend(email);
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <div className="rounded-[var(--v3-radius-md)] border border-[var(--v3-primary-soft)] bg-[var(--v3-primary-soft)] px-3 py-2 text-[12px] text-[var(--v3-primary)]">
        验证码已发送至 <span className="font-medium">{email}</span>，请查收邮件。
      </div>

      {serverError ? (
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-[var(--v3-radius-md)] border border-[var(--v3-danger-soft)] bg-[var(--v3-danger-soft)] px-3 py-2 text-[12px] text-[var(--v3-danger)]"
        >
          {serverError}
        </p>
      ) : null}

      <AuthField
        id="otp-code"
        label="验证码"
        icon={Mail}
        placeholder="6 位数字"
        autoComplete="one-time-code"
        inputMode="numeric"
        name="code"
        value={code}
        onChange={handleChange}
        error={error}
        ref={codeRef}
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
            <span>{VERIFY_LOADING}</span>
          </>
        ) : (
          <span>验证并登录</span>
        )}
      </button>

      <div className="flex items-center justify-between text-[13px] text-[var(--v3-text-secondary)]">
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={resendCountdown > 0 || isBusy}
          className="font-medium text-[var(--v3-primary)] transition-colors hover:underline disabled:opacity-50"
        >
          {resendCountdown > 0 ? `重新发送 (${resendCountdown}s)` : '重新发送'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isBusy}
          className="transition-colors hover:text-[var(--v3-text-strong)] disabled:opacity-50"
        >
          返回登录
        </button>
      </div>
    </form>
  );
}
