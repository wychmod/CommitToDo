/**
 * Type contracts for the real authentication modal.
 *
 * The modal now drives CloudBase email/password/OTP and GitHub OAuth flows.
 * No raw tokens are stored in Presentation state; only session summaries.
 */

/** Authentication view rendered inside the modal. */
export type AuthView = 'login' | 'signup' | 'forgot-password' | 'verify-otp';

/** Which auth method is selected in the dialog (email or phone). */
export type AuthMethod = 'email' | 'phone';

/** Which auth provider established the session. */
export type AuthProvider = 'email' | 'phone' | 'github';

/** In-flight async operation surfaced by the auth store. */
export type AuthOperation =
  | 'initialize'
  | 'login-email'
  | 'signup-email'
  | 'login-phone'
  | 'signup-phone'
  | 'verify-otp'
  | 'github'
  | 'bind-phone'
  | 'signout'
  | 'recovery'
  | null;

/** A normalized auth error surfaced to forms. */
export type AuthErrorCode =
  | 'invalid-credentials'
  | 'email-already-in-use'
  | 'invalid-code'
  | 'rate-limited'
  | 'server-error'
  | null;

/** Zustand store shape for real auth (mirror of the store public API). */
export interface AuthStoreLike {
  operation: AuthOperation;
  error: string | null;

  signInWithEmail(email: string, password: string): Promise<boolean>;
  signUpWithEmail(email: string, password: string): Promise<{ verificationId: string } | null>;
  verifyEmailOtp(verificationId: string, code: string): Promise<boolean>;
  signInWithGithub?(): Promise<{ url: string }>;
  clearError(): void;
}

/* ---- Form value / error shapes ---- */

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface SignupFormValues {
  email: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
}

export interface OtpFormValues {
  code: string;
}

export interface RecoveryFormValues {
  email: string;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
  form?: string;
}

export interface SignupFormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  acceptedTerms?: string;
}

export interface OtpFormErrors {
  code?: string;
}

export interface RecoveryFormErrors {
  email?: string;
}
