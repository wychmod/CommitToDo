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
  const { session, profile, resolveLocalWorkspace } = useAuthStore();
  const [resolved, setResolved] = React.useState<'checking' | 'owned' | 'mismatch'>('checking');

  React.useEffect(() => {
    let cancelled = false;

    async function check() {
      const result = await resolveLocalWorkspace();
      if (cancelled) return;

      if (result.type === 'no-legacy-data' || result.type === 'claimed-by-current') {
        setResolved('owned');
      } else {
        setResolved('mismatch');
      }
    }

    void check();
    return () => { cancelled = true; };
  }, [session, profile, resolveLocalWorkspace]);

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
