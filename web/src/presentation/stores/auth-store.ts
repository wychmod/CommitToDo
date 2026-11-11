/**
 * Real authentication store (Zustand).
 *
 * Holds only the session summary and profile snapshot. Raw tokens are never
 * stored here; they remain inside the CloudBase SDK.
 */
import { create } from 'zustand';

import { container } from '@/core/di/injection-container';
import type { AuthSessionStatus, AuthSessionSummary } from '@/domain/entities/auth-session';
import type { UserProfile } from '@/domain/entities/user-profile';
import type { IAuthRepository } from '@/domain/repositories/i-auth-repository';
import { InitializeAuthSessionUseCase } from '@/application/usecases/auth/initialize-auth-session-usecase';
import { SignInWithEmailUseCase } from '@/application/usecases/auth/sign-in-with-email-usecase';
import { SignUpWithEmailUseCase } from '@/application/usecases/auth/sign-up-with-email-usecase';
import { SignOutUseCase } from '@/application/usecases/auth/sign-out-usecase';
import { CompleteOAuthCallbackUseCase } from '@/application/usecases/auth/complete-oauth-callback-usecase';
import { BootstrapUserProfileUseCase } from '@/application/usecases/auth/bootstrap-user-profile-usecase';
import { ResolveLocalWorkspaceUseCase } from '@/application/usecases/auth/resolve-local-workspace-usecase';
import { StartGithubAuthUseCase } from '@/application/usecases/auth/start-github-auth-usecase';

export type AuthOperation =
  | 'initialize'
  | 'login-email'
  | 'signup-email'
  | 'login-phone'
  | 'signup-phone'
  | 'github'
  | 'verify-otp'
  | 'bind-phone'
  | 'recovery'
  | 'signout'
  | null;

export interface AuthState {
  status: AuthSessionStatus;
  session: AuthSessionSummary | null;
  profile: UserProfile | null;
  operation: AuthOperation;
  error: string | null;

  initialize(): Promise<void>;
  signInWithEmail(email: string, password: string): Promise<boolean>;
  signUpWithEmail(email: string, password: string): Promise<{ verificationId: string } | null>;
  verifyEmailOtp(verificationId: string, code: string): Promise<boolean>;
  startPhoneAuth(phone: string, shouldCreateUser: boolean): Promise<{ verificationId: string; retryAfterSeconds: number } | null>;
  verifyPhoneOtp(verificationId: string, code: string): Promise<boolean>;
  startGithubAuth(intent: 'login' | 'signup', returnTo: string): Promise<void>;
  requestPasswordReset(email: string): Promise<boolean>;
  completeOAuthCallback(input: { provider: 'github'; code: string; state: string }): Promise<boolean>;
  signOut(): Promise<void>;
  refreshProfile(): Promise<void>;
  resolveLocalWorkspace(): Promise<import('@/application/usecases/auth/resolve-local-workspace-usecase').LocalWorkspaceResolution>;
  claimLocalWorkspace(principalId: string): Promise<void>;
  clearError(): void;
}

const initializeUseCase = container.resolve(InitializeAuthSessionUseCase);
const signInWithEmailUseCase = container.resolve(SignInWithEmailUseCase);
const signUpWithEmailUseCase = container.resolve(SignUpWithEmailUseCase);
const signOutUseCase = container.resolve(SignOutUseCase);
const completeOAuthCallbackUseCase = container.resolve(CompleteOAuthCallbackUseCase);
const bootstrapProfileUseCase = container.resolve(BootstrapUserProfileUseCase);
const resolveLocalWorkspaceUseCase = container.resolve(ResolveLocalWorkspaceUseCase);
const startGithubAuthUseCase = container.resolve(StartGithubAuthUseCase);

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'initializing',
  session: null,
  profile: null,
  operation: null,
  error: null,

  initialize: async () => {
    set({ status: 'initializing', error: null });
    try {
      const session = await initializeUseCase.execute();
      if (session) {
        set({ status: 'authenticated', session });
        await get().refreshProfile();
      } else {
        set({ status: 'guest', session: null, profile: null });
      }
    } catch {
      set({ status: 'error', session: null, profile: null });
    }
  },

  signInWithEmail: async (email, password) => {
    set({ operation: 'login-email', error: null });
    try {
      const session = await signInWithEmailUseCase.execute({ email, password });
      set({ status: 'authenticated', session, operation: null });
      await get().refreshProfile();
      return true;
    } catch (err) {
      set({ error: normalizeError(err), operation: null });
      return false;
    }
  },

  signUpWithEmail: async (email, password) => {
    set({ operation: 'signup-email', error: null });
    try {
      const result = await signUpWithEmailUseCase.execute({ email, password });
      // Stay in the "awaiting OTP" phase with no in-flight operation so the
      // OTP submit button is not stuck in a loading state. Verification is
      // driven by the dialog's local view state, not by `operation`.
      set({ operation: null });
      return { verificationId: result.verificationId };
    } catch (err) {
      set({ error: normalizeError(err), operation: null });
      return null;
    }
  },

  verifyEmailOtp: async (verificationId, code) => {
    set({ operation: 'verify-otp', error: null });
    try {
      const authRepository = container.resolve<IAuthRepository>('IAuthRepository');
      const session = await authRepository.verifyOtp(verificationId, code);
      set({ status: 'authenticated', session, operation: null });
      await get().refreshProfile();
      return true;
    } catch (err) {
      set({ error: normalizeError(err), operation: null });
      return false;
    }
  },

  startPhoneAuth: async (phone, shouldCreateUser) => {
    set({ operation: shouldCreateUser ? 'signup-phone' : 'login-phone', error: null });
    try {
      const authRepository = container.resolve<IAuthRepository>('IAuthRepository');
      const result = await authRepository.startPhoneAuth({ phone, shouldCreateUser });
      set({ operation: null });
      return result;
    } catch (err) {
      set({ error: normalizeError(err), operation: null });
      return null;
    }
  },

  verifyPhoneOtp: async (verificationId, code) => {
    set({ operation: 'verify-otp', error: null });
    try {
      const authRepository = container.resolve<IAuthRepository>('IAuthRepository');
      const session = await authRepository.verifyOtp(verificationId, code);
      set({ status: 'authenticated', session, operation: null });
      await get().refreshProfile();
      return true;
    } catch (err) {
      set({ error: normalizeError(err), operation: null });
      return false;
    }
  },

  startGithubAuth: async (intent, returnTo) => {
    set({ operation: 'github', error: null });
    try {
      const { url } = await startGithubAuthUseCase.execute({ intent, returnTo });
      window.location.href = url;
    } catch (err) {
      set({ error: normalizeError(err), operation: null });
    }
  },

  requestPasswordReset: async (email) => {
    set({ operation: 'recovery', error: null });
    try {
      const authRepository = container.resolve<IAuthRepository>('IAuthRepository');
      await authRepository.resetPassword(email);
      set({ operation: null });
      return true;
    } catch (err) {
      set({ error: normalizeError(err), operation: null });
      return false;
    }
  },

  completeOAuthCallback: async (input) => {
    set({ operation: 'github', error: null });
    try {
      const session = await completeOAuthCallbackUseCase.execute(input);
      set({ status: 'authenticated', session, operation: null });
      await get().refreshProfile();
      return true;
    } catch (err) {
      set({ error: normalizeError(err), operation: null });
      return false;
    }
  },

  signOut: async () => {
    set({ operation: 'signout', error: null });
    try {
      await signOutUseCase.execute();
      set({ status: 'guest', session: null, profile: null, operation: null });
    } catch (err) {
      set({ error: normalizeError(err), operation: null });
    }
  },

  refreshProfile: async () => {
    try {
      const profile = await bootstrapProfileUseCase.execute();
      set({ profile });
    } catch {
      // Profile bootstrap is best-effort; don't flip auth state on failure.
    }
  },

  resolveLocalWorkspace: async () => {
    const principalId = get().profile?.principalId ?? get().session?.userId;
    if (!principalId) return { type: 'no-legacy-data' as const };
    return resolveLocalWorkspaceUseCase.execute(principalId);
  },

  claimLocalWorkspace: async (principalId) => {
    const repository = container.resolve<import('@/domain/repositories/i-local-workspace-repository').ILocalWorkspaceRepository>('ILocalWorkspaceRepository');
    await repository.setOwner({ principalId, claimedAt: new Date().toISOString() });
  },

  clearError: () => set({ error: null }),
}));

function normalizeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return '发生未知错误，请稍后重试。';
}
