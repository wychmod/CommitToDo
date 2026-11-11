/**
 * Route guard for guest-only pages (/login, /signup).
 *
 * Redirects authenticated visitors to a safe returnTo or /workspace.
 */
import * as React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';

import { useAuthStore } from '@/presentation/stores/auth-store';
import { sanitizeReturnTo } from '@/core/auth/auth-return-to';

interface PublicOnlyRouteProps {
  children: React.ReactNode;
}

export function PublicOnlyRoute({ children }: PublicOnlyRouteProps): JSX.Element {
  const { status, initialize } = useAuthStore();
  const [searchParams] = useSearchParams();

  React.useEffect(() => {
    if (status === 'initializing') {
      void initialize();
    }
  }, [status, initialize]);

  if (status === 'initializing') {
    return <PublicInitializingView />;
  }

  if (status === 'error') {
    // Allow guest flow on initialization error; route guard below handles auth.
  }

  if (status === 'authenticated') {
    const returnTo = sanitizeReturnTo(searchParams.get('returnTo'));
    return <Navigate to={returnTo} replace />;
  }

  return <>{children}</>;
}

function PublicInitializingView(): JSX.Element {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[var(--v3-bg)]">
      <span className="auth-spinner h-6 w-6" aria-hidden="true" />
    </div>
  );
}
