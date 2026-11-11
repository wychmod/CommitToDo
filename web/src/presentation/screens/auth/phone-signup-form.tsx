import { Check } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/core/utils/formatters';
import type { AuthOperation } from './auth-types';
import { PhoneField } from './phone-field';
import { toE164 } from './phone-utils';
import { OtpField } from './otp-field';
import { CaptchaChallenge } from './captcha-challenge';

const SEND_CODE_LOADING = '正在发送…';
const VERIFY_LOADING = '正在创建…';
const RESEND_SECONDS = 60;

type PhoneSignupStep = 'phone' | 'otp';

export interface PhoneSignupFormProps {
  operation: AuthOperation;
  serverError: string | null;
  onSendCode(phone: string): Promise<{ verificationId: string; retryAfterSeconds: number } | null>;
  onVerifyCode(verificationId: string, code: string): Promise<boolean>;
  onAuthenticated(): void;
  onNavigateLogin(): void;
  onClearError(): void;
}

/**
 * Phone signup form with two steps:
 * 1. Enter phone number, accept terms, and request OTP
 * 2. Enter OTP code and verify to create account
 *
 * Signup mode sets shouldCreateUser=true.
 */
export function PhoneSignupForm({
  operation,
  serverError,
  onSendCode,
  onVerifyCode,
  onAuthenticated,
  onNavigateLogin,
  onClearError,
}: PhoneSignupFormProps): JSX.Element {
  const [step, setStep] = React.useState<PhoneSignupStep>('phone');
  const [countryCode, setCountryCode] = React.useState('+86');
  const [phone, setPhone] = React.useState('');
  const [code, setCode] = React.useState('');
  const [verificationId, setVerificationId] = React.useState('');
  const [phoneError, setPhoneError] = React.useState<string | undefined>();
  const [codeError, setCodeError] = React.useState<string | undefined>();
  const [termsError, setTermsError] = React.useState<string | undefined>();
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);
  const [countdown, setCountdown] = React.useState(0);
  const [captchaRequired, setCaptchaRequired] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  const isSending = operation === 'signup-phone';
  const isVerifying = operation === 'verify-otp';
  const isBusy = isSending || isVerifying || success;

  React.useEffect(() => {
    if (countdown <= 0) return;
    const id = window.setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [countdown]);

  const validatePhone = (): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    if (!cleaned) {
      setPhoneError('请输入手机号');
      return false;
    }
    if (cleaned.length < 6 || cleaned.length > 15) {
      setPhoneError('手机号格式不正确');
      return false;
    }
    setPhoneError(undefined);
    return true;
  };

  const handleSendCode = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (isBusy) return;

    if (!acceptedTerms) {
      setTermsError('请先同意服务条款和隐私政策');
      return;
    }
    setTermsError(undefined);

    if (!validatePhone()) return;

    const e164 = toE164(countryCode, phone);
    const result = await onSendCode(e164);
    if (result) {
      setVerificationId(result.verificationId);
      setCountdown(result.retryAfterSeconds || RESEND_SECONDS);
      setStep('otp');
    } else if (serverError?.includes('captcha')) {
      setCaptchaRequired(true);
    }
  };

  const handleResend = async (): Promise<void> => {
    if (countdown > 0 || isBusy) return;
    const e164 = toE164(countryCode, phone);
    const result = await onSendCode(e164);
    if (result) {
      setVerificationId(result.verificationId);
      setCountdown(result.retryAfterSeconds || RESEND_SECONDS);
    }
  };

  const handleVerify = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (isBusy) return;

    if (code.length !== 6) {
      setCodeError('请输入 6 位验证码');
      return;
    }
    setCodeError(undefined);

    const ok = await onVerifyCode(verificationId, code);
    if (ok) {
      setSuccess(true);
      setTimeout(() => onAuthenticated(), 300);
    }
  };

  const handleCaptchaVerified = (token: string): void => {
    setCaptchaRequired(false);
    void token;
  };

  const handleBack = (): void => {
    setStep('phone');
    setCode('');
    setCodeError(undefined);
    onClearError();
  };

  if (step === 'otp') {
    return (
      <form className="flex flex-col gap-4" onSubmit={handleVerify} noValidate>
        <div className="rounded-[var(--v3-radius-md)] border border-[var(--v3-primary-soft)] bg-[var(--v3-primary-soft)] px-3 py-2 text-[12px] text-[var(--v3-primary)]">
          验证码已发送至 <span className="font-medium">{countryCode} {phone}</span>
        </div>

        {serverError ? (
          <p role="alert" aria-live="assertive" className="rounded-[var(--v3-radius-md)] border border-[var(--v3-danger-soft)] bg-[var(--v3-danger-soft)] px-3 py-2 text-[12px] text-[var(--v3-danger)]">
            {serverError}
          </p>
        ) : null}

        <OtpField
          id="signup-phone-otp"
          value={code}
          onChange={(v) => {
            setCode(v);
            setCodeError(undefined);
            onClearError();
          }}
          error={codeError}
          disabled={isBusy}
        />

        <button
          type="submit"
          disabled={isBusy}
          className={cn(
            'flex h-12 w-full items-center justify-center gap-2 rounded-[var(--v3-radius-md)] text-[14px] font-semibold transition-[filter,box-shadow,transform] duration-(--v3-fast)',
            success
              ? 'bg-[var(--v3-primary-soft)] text-[var(--v3-primary)]'
              : 'bg-[linear-gradient(180deg,var(--v3-primary-dim),var(--v3-primary))] text-[var(--v3-text-on-primary)] hover:-translate-y-px hover:[filter:brightness(1.06)] hover:[box-shadow:var(--v3-glow-primary)]',
            'disabled:pointer-events-none disabled:opacity-60'
          )}
        >
          {isVerifying ? (
            <>
              <span className="auth-spinner" aria-hidden="true" />
              <span>{VERIFY_LOADING}</span>
            </>
          ) : success ? (
            <>
              <Check size={16} strokeWidth={2} aria-hidden="true" />
              <span>注册成功</span>
            </>
          ) : (
            <span>验证并注册</span>
          )}
        </button>

        <div className="flex items-center justify-between text-[13px] text-[var(--v3-text-secondary)]">
          <button
            type="button"
            onClick={() => void handleResend()}
            disabled={countdown > 0 || isBusy}
            className="font-medium text-[var(--v3-primary)] transition-colors hover:underline disabled:opacity-50"
          >
            {countdown > 0 ? `重新发送 (${countdown}s)` : '重新发送'}
          </button>
          <button
            type="button"
            onClick={handleBack}
            disabled={isBusy}
            className="transition-colors hover:text-[var(--v3-text-strong)] disabled:opacity-50"
          >
            返回
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSendCode} noValidate>
      {serverError ? (
        <p role="alert" aria-live="assertive" className="rounded-[var(--v3-radius-md)] border border-[var(--v3-danger-soft)] bg-[var(--v3-danger-soft)] px-3 py-2 text-[12px] text-[var(--v3-danger)]">
          {serverError}
        </p>
      ) : null}

      {captchaRequired ? (
        <CaptchaChallenge
          onVerified={handleCaptchaVerified}
          onExpired={() => setCaptchaRequired(false)}
        />
      ) : null}

      <PhoneField
        id="signup-phone"
        value={phone}
        countryCode={countryCode}
        onChange={(v) => {
          setPhone(v);
          setPhoneError(undefined);
          onClearError();
        }}
        onCountryCodeChange={setCountryCode}
        error={phoneError}
        disabled={isBusy}
      />

      <div className="flex items-start gap-2">
        <input
          id="signup-phone-terms"
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => {
            setAcceptedTerms(e.target.checked);
            setTermsError(undefined);
          }}
          disabled={isBusy}
          aria-invalid={termsError ? true : undefined}
          className="mt-0.5 h-4 w-4 accent-[var(--v3-primary)]"
        />
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-[var(--v3-text-secondary)]">
            <label htmlFor="signup-phone-terms" className="cursor-pointer">
              我已阅读并同意
            </label>{' '}
            <button type="button" className="font-medium text-[var(--v3-text)] underline decoration-dotted underline-offset-2 transition-colors hover:text-[var(--v3-primary)]">
              服务条款
            </button>{' '}
            和{' '}
            <button type="button" className="font-medium text-[var(--v3-text)] underline decoration-dotted underline-offset-2 transition-colors hover:text-[var(--v3-primary)]">
              隐私政策
            </button>
          </span>
          {termsError ? (
            <p aria-live="polite" className="text-[12px] text-[var(--v3-danger)]">
              {termsError}
            </p>
          ) : null}
        </div>
      </div>

      <button
        type="submit"
        disabled={isBusy || captchaRequired}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--v3-radius-md)] bg-[linear-gradient(180deg,var(--v3-primary-dim),var(--v3-primary))] text-[14px] font-semibold text-[var(--v3-text-on-primary)] transition-[filter,box-shadow,transform] duration-(--v3-fast) hover:-translate-y-px hover:[filter:brightness(1.06)] hover:[box-shadow:var(--v3-glow-primary)] disabled:pointer-events-none disabled:opacity-60"
      >
        {isSending ? (
          <>
            <span className="auth-spinner" aria-hidden="true" />
            <span>{SEND_CODE_LOADING}</span>
          </>
        ) : (
          <span>获取验证码</span>
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
