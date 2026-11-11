/**
 * OAuth callback handler.
 *
 * Validates state, nonce, intent and returnTo. Does not display codes or
 * tokens. On success replaces to the safe returnTo.
 */
import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAuthStore } from '@/presentation/stores/auth-store';
import { consumeOAuthState } from '@/core/auth/oauth-state-storage';
import { sanitizeReturnTo } from '@/core/auth/auth-return-to';

type CallbackStatus =
  | 'processing'
  | 'cancelled'
  | 'invalidState'
  | 'providerError'
  | 'profileBootstrapError'
  | 'success';

export function OAuthCallbackScreen(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { completeOAuthCallback } = useAuthStore();
  const [status, setStatus] = React.useState<CallbackStatus>('processing');

  React.useEffect(() => {
    async function run() {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const providerError = searchParams.get('error');
      const cancelled = searchParams.get('cancelled') === 'true';

      if (cancelled) {
        setStatus('cancelled');
        return;
      }

      if (providerError) {
        setStatus('providerError');
        return;
      }

      if (!code || !state) {
        setStatus('invalidState');
        return;
      }

      const stored = consumeOAuthState(state);
      if (!stored) {
        setStatus('invalidState');
        return;
      }

      try {
        const completed = await completeOAuthCallback({ provider: 'github', code, state });
        if (!completed) {
          setStatus('profileBootstrapError');
          return;
        }
        const returnTo = sanitizeReturnTo(stored.returnTo);
        navigate(returnTo, { replace: true });
        setStatus('success');
      } catch {
        setStatus('profileBootstrapError');
      }
    }

    void run();
  }, [searchParams, navigate, completeOAuthCallback]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[var(--v3-bg)] px-6">
      <div className="max-w-md rounded-[var(--v3-radius-lg)] border border-[var(--v3-border)] bg-[var(--v3-card)] p-6 text-center shadow-[var(--v3-shadow-panel)]">
        <StatusContent status={status} onBack={() => navigate('/login', { replace: true })} />
      </div>
    </div>
  );
}

interface StatusContentProps {
  status: CallbackStatus;
  onBack(): void;
}

function StatusContent({ status, onBack }: StatusContentProps): JSX.Element {
  if (status === 'success') {
    return <p className="text-[14px] text-[var(--v3-text-strong)]">登录成功，正在跳转…</p>;
  }

  if (status === 'processing') {
    return (
      <div className="flex flex-col items-center gap-3">
        <span className="auth-spinner h-6 w-6" aria-hidden="true" />
        <p className="text-[14px] text-[var(--v3-text-strong)]">正在完成身份验证…</p>
      </div>
    );
  }

  const messages: Record<Exclude<CallbackStatus, 'processing' | 'success'>, string> = {
    cancelled: '授权已取消。',
    invalidState: '安全校验失败，请重新登录。',
    providerError: '第三方登录失败，请稍后重试。',
    profileBootstrapError: '账户初始化失败，请重试。',
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-[14px] text-[var(--v3-text-strong)]">{messages[status]}</p>
      <button
        type="button"
        onClick={onBack}
        className="rounded-[var(--v3-radius-md)] bg-[var(--v3-primary)] px-4 py-2 text-[14px] text-[var(--v3-text-on-primary)]"
      >
        返回登录
      </button>
    </div>
  );
}
