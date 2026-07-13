import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { LandingPage } from '@/presentation/screens/landing/landing-page';
import { useDemoAuthStore } from '@/presentation/stores/demo-auth-store';
import { selectIsAuthenticated } from './auth-types';
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
  const isAuthenticated = useDemoAuthStore(selectIsAuthenticated);

  const mode = authModeFromPathname(pathname);
  const open = mode !== null && !isAuthenticated;

  useEffect(() => {
    if (isAuthenticated && (pathname === '/login' || pathname === '/signup')) {
      navigate('/workspace', { replace: true });
    }
  }, [isAuthenticated, pathname, navigate]);

  const handleOpenChange = (next: boolean): void => {
    if (!next) navigate('/', { replace: true });
  };

  return (
    <>
      <LandingPage />
      <AuthDialog
        open={open}
        routeMode={mode === 'signup' ? 'signup' : 'login'}
        onOpenChange={handleOpenChange}
        onNavigateLogin={() => navigate('/login')}
        onNavigateSignup={() => navigate('/signup')}
        onAuthenticated={() => navigate('/workspace', { replace: true })}
      />
      <Outlet />
    </>
  );
}
