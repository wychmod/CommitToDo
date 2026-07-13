/**
 * Type contracts for the demo authentication modal.
 *
 * This is a Presentation-layer demo: the types describe an in-memory,
 * optionally-persisted `admin` session. There is intentionally NO
 * `password`, `token` or `refreshToken` field anywhere in these types, and no
 * Domain entity / Repository is introduced — see `plan.md` §2.2 for the
 * rationale (a fake auth system must not masquerade as a real security
 * boundary).
 */

/** Authentication view rendered inside the modal. `login`/`signup` come from the URL; `forgot-password` is a local sub-view. */
export type AuthView = 'login' | 'signup' | 'forgot-password';

/** How the demo `admin` session was established. */
export type DemoAuthProvider = 'credentials' | 'github';

/** A demo user. The username is locked to `admin` so no component assumes arbitrary sign-up is possible. */
export interface DemoAuthUser {
  username: 'admin';
  provider: DemoAuthProvider;
  /** ISO 8601 timestamp; stored as a string for safe JSON serialization. */
  signedInAt: string;
}

/** The only shape ever persisted to Web Storage. Deliberately minimal. */
export interface DemoAuthSession {
  version: 1;
  user: DemoAuthUser;
  /** `local` -> localStorage, `session` -> sessionStorage. */
  persistence: 'local' | 'session';
}

/** Which simulated async operation (if any) is currently in flight. */
export type AuthOperation = 'login' | 'github' | 'signup' | 'recovery' | null;

/** Demo auth error code. Only credential mismatch surfaces a code. */
export type AuthErrorCode = 'invalid-credentials' | null;

/** Input for credential sign-in. */
export interface DemoSignInInput {
  username: string;
  password: string;
  remember: boolean;
}

/** Result of a sign-in attempt (credentials or GitHub). */
export type DemoAuthResult =
  | {
      ok: true;
      session: DemoAuthSession;
      /** Storage was unavailable; the in-memory session is still valid. */
      warning?: 'storage-unavailable';
    }
  | { ok: false; code: 'invalid-credentials' };

/** Result of simulated registration: never creates a real account. */
export type DemoRegistrationResult = {
  ok: true;
  suggestedUsername: 'admin';
};

/** Result of simulated password recovery: never sends mail. */
export type DemoRecoveryResult = {
  ok: true;
  suggestedUsername: 'admin';
};

/** Zustand store shape for demo auth. */
export interface DemoAuthState {
  session: DemoAuthSession | null;
  operation: AuthOperation;
  error: AuthErrorCode;

  signIn(input: DemoSignInInput): Promise<DemoAuthResult>;
  signInWithGithub(remember: boolean): Promise<DemoAuthResult>;
  simulateRegistration(): Promise<DemoRegistrationResult>;
  simulateRecovery(): Promise<DemoRecoveryResult>;
  clearError(): void;
  signOut(): void;
}

/**
 * Derive auth status solely from the session. There is no separate
 * `isAuthenticated` boolean to avoid a state where the two disagree.
 */
export const selectIsAuthenticated = (state: DemoAuthState): boolean =>
  state.session !== null;

/* ---- Form value / error shapes ---- */

export interface LoginFormValues {
  username: string;
  password: string;
  remember: boolean;
}

export interface SignupFormValues {
  username: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
}

export interface LoginFormErrors {
  username?: string;
  password?: string;
  /** Credential-level error surfaced from the store. */
  form?: string;
}

export interface SignupFormErrors {
  username?: string;
  password?: string;
  confirmPassword?: string;
  acceptedTerms?: string;
}
