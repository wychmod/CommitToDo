/**
 * Guards application pages after authentication by checking local workspace
 * ownership. If the local IndexedDB data belongs to a different principal,
 * redirect to /auth/local-data.
 */
import * as React from 'react';
import { Navigate } from 'react-router-dom';

import { useAuthStore } from '@/presentation/stores/auth-store';

interface WorkspaceOwnershipGuardProps {
  children: React.ReactNode;
}

export function WorkspaceOwnershipGuard({ children }: WorkspaceOwnershipGuardProps): JSX.Element {
  const { session, profile, mode, resolveLocalWorkspace } = useAuthStore();
  const [resolved, setResolved] = React.useState<'checking' | 'owned' | 'mismatch'>('checking');

  React.useEffect(() => {
    if (mode === 'local') {
      setResolved('owned');
      return;
    }

    let cancelled = false;

    async function check() {
      const result = await resolveLocalWorkspace();
      if (cancelled) return;

      if (result.type === 'claimed-by-current') {
        if (result.requiresReload) {
          window.location.reload();
          return;
        }
        setResolved('owned');
      } else {
        setResolved('mismatch');
      }
    }

    void check();
    return () => { cancelled = true; };
  }, [session, profile, mode, resolveLocalWorkspace]);

  if (mode === 'local') {
    // 本地模式没有账号，本机库就是当前工作区，无需归属校验。
    return <>{children}</>;
  }

  if (resolved === 'checking') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[var(--v3-bg)]">
        <span className="auth-spinner h-6 w-6" aria-hidden="true" />
      </div>
    );
  }

  if (resolved === 'mismatch') {
    return <Navigate to="/auth/local-data" replace />;
  }

  return <>{children}</>;
}
