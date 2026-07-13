import { ArrowLeft, KeyRound } from 'lucide-react';

import type { AuthOperation, DemoRecoveryResult } from './auth-types';

const RECOVERY_LOADING = '正在恢复…';

export interface ForgotPasswordViewProps {
  operation: AuthOperation;
  onRecover(): Promise<DemoRecoveryResult>;
  onRecovered(username: 'admin'): void;
  onBack(): void;
}

export function ForgotPasswordView({
  operation,
  onRecover,
  onRecovered,
  onBack,
}: ForgotPasswordViewProps): JSX.Element {
  const isBusy = operation === 'recovery';

  const handleRecover = async (): Promise<void> => {
    if (isBusy) return;
    await onRecover();
    onRecovered('admin');
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3 rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] px-4 py-3">
        <KeyRound
          size={18}
          strokeWidth={1.5}
          aria-hidden="true"
          className="shrink-0 text-[var(--v3-launch)]"
        />
        <div className="flex flex-col">
          <span className="text-[12px] text-[var(--v3-text-muted)]">
            演示账号 / 密码
          </span>
          <span className="font-mono text-[14px] text-[var(--v3-text-strong)]">
            admin / admin
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleRecover}
        disabled={isBusy}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--v3-radius-md)] bg-[linear-gradient(180deg,var(--v3-primary-dim),var(--v3-primary))] text-[14px] font-semibold text-[var(--v3-text-on-primary)] transition-[filter,box-shadow,transform] duration-(--v3-fast) hover:-translate-y-px hover:[filter:brightness(1.06)] hover:[box-shadow:var(--v3-glow-primary)] disabled:pointer-events-none disabled:opacity-60"
      >
        {isBusy ? (
          <>
            <span className="auth-spinner" aria-hidden="true" />
            <span>{RECOVERY_LOADING}</span>
          </>
        ) : (
          <span>恢复演示账号</span>
        )}
      </button>

      <button
        type="button"
        onClick={onBack}
        disabled={isBusy}
        className="flex items-center justify-center gap-1.5 text-[13px] text-[var(--v3-text-secondary)] transition-colors hover:text-[var(--v3-text-strong)] disabled:opacity-50"
      >
        <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" />
        <span>返回登录</span>
      </button>
    </div>
  );
}
