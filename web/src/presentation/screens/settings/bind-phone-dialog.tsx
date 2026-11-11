import '@/core/theme/v3-tokens.css';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Check, X } from 'lucide-react';
import * as React from 'react';

import { container } from '@/core/di/injection-container';
import { cn } from '@/core/utils/formatters';
import { RequestAuthChallengeUseCase } from '@/application/usecases/auth/request-auth-challenge-usecase';
import { BindPhoneUseCase } from '@/application/usecases/auth/bind-phone-usecase';
import { PhoneField } from '@/presentation/screens/auth/phone-field';
import { toE164 } from '@/presentation/screens/auth/phone-utils';
import { OtpField } from '@/presentation/screens/auth/otp-field';
import { useAuthStore } from '@/presentation/stores/auth-store';

type BindStep = 'phone' | 'otp' | 'done';

export interface BindPhoneDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
}

/**
 * Dialog for binding a phone number to the current authenticated account.
 * Two-step flow: enter phone → verify OTP code.
 */
export function BindPhoneDialog({ open, onOpenChange }: BindPhoneDialogProps): JSX.Element {
  const [step, setStep] = React.useState<BindStep>('phone');
  const [countryCode, setCountryCode] = React.useState('+86');
  const [phone, setPhone] = React.useState('');
  const [code, setCode] = React.useState('');
  const [phoneError, setPhoneError] = React.useState<string | undefined>();
  const [codeError, setCodeError] = React.useState<string | undefined>();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [challengeId, setChallengeId] = React.useState('');
  const [countdown, setCountdown] = React.useState(0);
  const [isBusy, setIsBusy] = React.useState(false);

  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  React.useEffect(() => {
    if (open) {
      setStep('phone');
      setPhone('');
      setCode('');
      setPhoneError(undefined);
      setCodeError(undefined);
      setServerError(null);
      setChallengeId('');
      setCountdown(0);
      setIsBusy(false);
    }
  }, [open]);

  React.useEffect(() => {
    if (countdown <= 0) return;
    const id = window.setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [countdown]);

  const handleSendCode = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (isBusy) return;

    const cleaned = phone.replace(/\D/g, '');
    if (!cleaned || cleaned.length < 6 || cleaned.length > 15) {
      setPhoneError('请输入有效的手机号');
      return;
    }
    setPhoneError(undefined);
    setIsBusy(true);
    setServerError(null);

    try {
      const useCase = container.resolve(RequestAuthChallengeUseCase);
      const e164 = toE164(countryCode, phone);
      const challenge = await useCase.execute({
        purpose: 'bind',
        channel: 'sms',
        target: e164,
      });
      setChallengeId(challenge.challengeId);
      setCountdown(challenge.retryAfterSeconds || 60);
      setStep('otp');
    } catch (err) {
      setServerError(err instanceof Error ? err.message : '发送验证码失败');
    } finally {
      setIsBusy(false);
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
    setIsBusy(true);
    setServerError(null);

    try {
      const useCase = container.resolve(BindPhoneUseCase);
      const e164 = toE164(countryCode, phone);
      await useCase.execute({
        phone: e164,
        verificationId: challengeId,
        code,
      });
      setStep('done');
      await refreshProfile();
      setTimeout(() => onOpenChange(false), 1200);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : '绑定失败，请重试');
    } finally {
      setIsBusy(false);
    }
  };

  const handleResend = async (): Promise<void> => {
    if (countdown > 0 || isBusy) return;
    setIsBusy(true);
    setServerError(null);
    try {
      const useCase = container.resolve(RequestAuthChallengeUseCase);
      const e164 = toE164(countryCode, phone);
      const challenge = await useCase.execute({
        purpose: 'bind',
        channel: 'sms',
        target: e164,
      });
      setChallengeId(challenge.challengeId);
      setCountdown(challenge.retryAfterSeconds || 60);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : '重新发送失败');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-[var(--v3-radius-lg)] border border-[var(--v3-border)] bg-[var(--v3-card)] p-6 shadow-[var(--v3-shadow-panel)]">
          <DialogPrimitive.Close className="absolute right-4 top-4 text-[var(--v3-text-muted)] transition-colors hover:text-[var(--v3-text-strong)]" aria-label="关闭">
            <X size={16} strokeWidth={1.5} aria-hidden="true" />
          </DialogPrimitive.Close>

          <DialogPrimitive.Title className="text-[20px] font-bold text-[var(--v3-text-strong)]">
            绑定手机号
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1 text-[13px] text-[var(--v3-text-secondary)]">
            绑定后可使用手机号登录和接收安全通知。
          </DialogPrimitive.Description>

          {serverError ? (
            <p role="alert" className="mt-3 rounded-[var(--v3-radius-md)] border border-[var(--v3-danger-soft)] bg-[var(--v3-danger-soft)] px-3 py-2 text-[12px] text-[var(--v3-danger)]">
              {serverError}
            </p>
          ) : null}

          <div className="mt-5">
            {step === 'phone' ? (
              <form className="flex flex-col gap-4" onSubmit={handleSendCode} noValidate>
                <PhoneField
                  id="bind-phone"
                  value={phone}
                  countryCode={countryCode}
                  onChange={(v) => { setPhone(v); setPhoneError(undefined); }}
                  onCountryCodeChange={setCountryCode}
                  error={phoneError}
                  disabled={isBusy}
                />
                <button
                  type="submit"
                  disabled={isBusy}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-[var(--v3-radius-md)] bg-[linear-gradient(180deg,var(--v3-primary-dim),var(--v3-primary))] text-[14px] font-semibold text-[var(--v3-text-on-primary)] transition-[filter,box-shadow,transform] duration-(--v3-fast) hover:-translate-y-px hover:[filter:brightness(1.06)] disabled:pointer-events-none disabled:opacity-60"
                >
                  {isBusy ? '发送中…' : '获取验证码'}
                </button>
              </form>
            ) : null}

            {step === 'otp' ? (
              <form className="flex flex-col gap-4" onSubmit={handleVerify} noValidate>
                <div className="rounded-[var(--v3-radius-md)] border border-[var(--v3-primary-soft)] bg-[var(--v3-primary-soft)] px-3 py-2 text-[12px] text-[var(--v3-primary)]">
                  验证码已发送至 <span className="font-medium">{countryCode} {phone}</span>
                </div>
                <OtpField
                  id="bind-phone-otp"
                  value={code}
                  onChange={(v) => { setCode(v); setCodeError(undefined); }}
                  error={codeError}
                  disabled={isBusy}
                />
                <button
                  type="submit"
                  disabled={isBusy}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-[var(--v3-radius-md)] bg-[linear-gradient(180deg,var(--v3-primary-dim),var(--v3-primary))] text-[14px] font-semibold text-[var(--v3-text-on-primary)] transition-[filter,box-shadow,transform] duration-(--v3-fast) hover:-translate-y-px hover:[filter:brightness(1.06)] disabled:pointer-events-none disabled:opacity-60"
                >
                  验证并绑定
                </button>
                <div className="flex items-center justify-between text-[13px]">
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
                    onClick={() => { setStep('phone'); setCode(''); setServerError(null); }}
                    disabled={isBusy}
                    className="text-[var(--v3-text-secondary)] transition-colors hover:text-[var(--v3-text-strong)] disabled:opacity-50"
                  >
                    返回
                  </button>
                </div>
              </form>
            ) : null}

            {step === 'done' ? (
              <div className={cn('flex flex-col items-center gap-3 py-4 text-center')}>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--v3-primary-soft)] text-[var(--v3-success)]">
                  <Check size={24} strokeWidth={2} aria-hidden="true" />
                </span>
                <p className="text-[15px] font-medium text-[var(--v3-text-strong)]">
                  绑定成功
                </p>
                <p className="text-[13px] text-[var(--v3-text-secondary)]">
                  手机号 {countryCode} {phone} 已绑定到您的账户。
                </p>
              </div>
            ) : null}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
