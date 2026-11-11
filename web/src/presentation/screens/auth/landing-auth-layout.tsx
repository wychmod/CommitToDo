import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { LandingPage } from '@/presentation/screens/landing/landing-page';
import { useAuthStore } from '@/presentation/stores/auth-store';
import { sanitizeReturnTo } from '@/core/auth/auth-return-to';
import { AuthDialog } from './auth-dialog';

/**
 * Resolve an auth mode from a pathname. `login` / `signup` are real routes;
 * anything else (including `/`) means the dialog is closed.
 */
export function authModeFromPathname(
  pathname: string
): 'login' | 'signup' | null {
  if (pathname === '/login') return 'login';
  if (pathname === '/signup') return 'signup';
  return null;
}

/**
 * Shared parent layout for the landing page and its auth routes.
 *
 * `LandingPage` stays mounted across `/`, `/login` and `/signup` so the Hero
 * particle canvas and scroll position are never reset. The current pathname
 * drives the `AuthDialog` (open + mode). Authenticated visitors are redirected
 * away from the auth routes; closing the dialog returns to `/`.
 */
export function LandingAuthLayout(): JSX.Element {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const status = useAuthStore((s) => s.status);
  const initialize = useAuthStore((s) => s.initialize);

  const mode = authModeFromPathname(pathname);
  const isAuthenticated = status === 'authenticated';
  const open = mode !== null && !isAuthenticated;
  const returnTo = searchParams.get('returnTo') ?? undefined;

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (isAuthenticated && (pathname === '/login' || pathname === '/signup')) {
      const target = sanitizeReturnTo(returnTo);
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, pathname, navigate, returnTo]);

  const handleOpenChange = (next: boolean): void => {
    if (!next) navigate('/', { replace: true });
  };

  return (
    <>
      <LandingPage />
      <AuthDialog
        open={open}
        routeMode={mode === 'signup' ? 'signup' : 'login'}
        returnTo={returnTo}
        onOpenChange={handleOpenChange}
        onNavigateLogin={() => navigate('/login')}
        onNavigateSignup={() => navigate('/signup')}
        onAuthenticated={() => {
          const target = sanitizeReturnTo(returnTo);
          navigate(target, { replace: true });
        }}
      />
      <Outlet />
    </>
  );
}
