/**
 * Route guard for authenticated pages.
 *
 * Shows a full-screen loading while auth initializes. If initialization fails,
 * shows a retry screen instead of redirecting. If the user is a guest, redirects
 * to /login with a safe returnTo.
 */
import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuthStore } from '@/presentation/stores/auth-store';
import { buildLoginReturnTo } from '@/core/auth/auth-return-to';

interface AuthenticatedRouteProps {
  children: React.ReactNode;
}

export function AuthenticatedRoute({ children }: AuthenticatedRouteProps): JSX.Element {
  const { status, mode, session, initialize, enterLocalMode } = useAuthStore();
  const location = useLocation();

  React.useEffect(() => {
    if (status === 'initializing') {
      void initialize();
    }
  }, [status, initialize]);

  if (mode === 'local') {
    return <>{children}</>;
  }

  if (status === 'initializing') {
    return <AuthInitializingView />;
  }

  if (status === 'error') {
    return <AuthErrorView onRetry={initialize} onContinueLocally={enterLocalMode} />;
  }

  if (status === 'guest' || !session) {
    return (
      <Navigate
        to={buildLoginReturnTo(location.pathname, location.search, location.hash)}
        replace
      />
    );
  }

  return <>{children}</>;
}

function AuthInitializingView(): JSX.Element {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[var(--v3-bg)] text-[var(--v3-text-strong)]">
      <div className="flex flex-col items-center gap-3">
        <span className="auth-spinner h-6 w-6" aria-hidden="true" />
        <span className="text-[14px]">正在恢复会话…</span>
      </div>
    </div>
  );
}

interface AuthErrorViewProps {
  onRetry(): Promise<void>;
  onContinueLocally(): void;
}

function AuthErrorView({ onRetry, onContinueLocally }: AuthErrorViewProps): JSX.Element {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-[var(--v3-bg)] text-[var(--v3-text-strong)]">
      <p className="text-[14px]">会话初始化失败</p>
      <p className="max-w-[320px] text-center text-[13px] text-[var(--v3-text-muted)]">
        云端会话不可用时，可以继续使用本地数据，功能不受影响。
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void onRetry()}
          className="rounded-[var(--v3-radius-md)] bg-[var(--v3-primary)] px-4 py-2 text-[14px] text-[var(--v3-text-on-primary)]"
        >
          重试
        </button>
        <button
          type="button"
          onClick={onContinueLocally}
          className="rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] px-4 py-2 text-[14px] text-[var(--v3-text)]"
        >
          使用本地数据
        </button>
      </div>
    </div>
  );
}
