/**
 * Auth repository interface — Domain boundary.
 *
 * Implementations live in the Data layer and wrap the CloudBase Web SDK.
 */

import type { AuthSessionSummary } from '../entities/auth-session';

export type AuthProvider = 'github';

export interface SignInWithEmailInput {
  email: string;
  password: string;
}

export interface SignUpWithEmailInput {
  email: string;
  password: string;
}

export interface PhoneAuthInput {
  phone: string;
  shouldCreateUser: boolean;
}

export interface VerifyPhoneInput {
  verificationId: string;
  code: string;
}

export interface StartOAuthInput {
  provider: AuthProvider;
  intent: 'login' | 'signup';
  returnTo: string;
}

export interface CompleteOAuthInput {
  provider: AuthProvider;
  code: string;
  state: string;
}

export interface CompletePasswordResetInput {
  email: string;
  code: string;
  password: string;
}

export interface IAuthRepository {
  getSession(): Promise<AuthSessionSummary | null>;
  refreshSession(): Promise<AuthSessionSummary | null>;
  signInWithEmail(input: SignInWithEmailInput): Promise<AuthSessionSummary>;
  signUpWithEmail(input: SignUpWithEmailInput): Promise<{ session: AuthSessionSummary; verificationId: string }>;
  verifyOtp(verificationId: string, code: string): Promise<AuthSessionSummary>;
  startPhoneAuth(input: PhoneAuthInput): Promise<{ verificationId: string; retryAfterSeconds: number }>;
  startGithubAuth(input: StartOAuthInput): Promise<{ url: string }>;
  completeOAuthCallback(input: CompleteOAuthInput): Promise<AuthSessionSummary>;
  requestPasswordReset(email: string): Promise<void>;
  completePasswordReset(input: CompletePasswordResetInput): Promise<AuthSessionSummary>;
  reauthenticate(password: string): Promise<AuthSessionSummary>;
  signOut(): Promise<void>;
  onAuthStateChange(callback: (event: string, session: AuthSessionSummary | null) => void): () => void;
}
