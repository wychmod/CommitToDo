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
  const { status, session, initialize } = useAuthStore();
  const location = useLocation();

  React.useEffect(() => {
    if (status === 'initializing') {
      void initialize();
    }
  }, [status, initialize]);

  if (status === 'initializing') {
    return <AuthInitializingView />;
  }

  if (status === 'error') {
    return <AuthErrorView onRetry={initialize} />;
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
}

function AuthErrorView({ onRetry }: AuthErrorViewProps): JSX.Element {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-[var(--v3-bg)] text-[var(--v3-text-strong)]">
      <p className="text-[14px]">会话初始化失败</p>
      <button
        type="button"
        onClick={() => void onRetry()}
        className="rounded-[var(--v3-radius-md)] bg-[var(--v3-primary)] px-4 py-2 text-[14px] text-[var(--v3-text-on-primary)]"
      >
        重试
      </button>
    </div>
  );
}
