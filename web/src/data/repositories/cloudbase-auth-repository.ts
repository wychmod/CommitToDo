/**
 * CloudBase Web SDK implementation of IAuthRepository.
 */

import { injectable } from 'tsyringe';

import { getCloudBaseAuth } from '@/core/cloudbase/cloudbase-client';
import { SessionRefreshLock } from '@/core/auth/session-refresh-lock';
import { saveOAuthState } from '@/core/auth/oauth-state-storage';
import type { AuthSessionSummary } from '@/domain/entities/auth-session';
import {
  type IAuthRepository,
  type SignInWithEmailInput,
  type SignUpWithEmailInput,
  type PhoneAuthInput,
  type StartOAuthInput,
  type CompleteOAuthInput,
} from '@/domain/repositories/i-auth-repository';
import type { CloudBaseAuthSession, CloudBaseAuthUser, CloudBaseOtpResponse } from '@/core/cloudbase/cloudbase-types';

function isAnonymous(user: CloudBaseAuthUser): boolean {
  return user.is_anonymous === true;
}

function toSessionSummary(session: CloudBaseAuthSession): AuthSessionSummary {
  return {
    userId: session.user.id,
    expiresAt: session.expires_at,
    provider: session.user.app_metadata.provider ?? 'unknown',
    email: session.user.email ?? null,
  };
}

@injectable()
export class CloudBaseAuthRepository implements IAuthRepository {
  private readonly auth = getCloudBaseAuth();
  private readonly refreshLock = new SessionRefreshLock();
  private readonly pendingVerifications = new Map<string, CloudBaseOtpResponse['verifyOtp']>();

  async getSession(): Promise<AuthSessionSummary | null> {
    const { data, error } = await this.auth.getSession();
    if (error || !data?.session) return null;
    if (isAnonymous(data.session.user)) return null;
    return toSessionSummary(data.session);
  }

  async refreshSession(): Promise<AuthSessionSummary | null> {
    return this.refreshLock.run(async () => {
      const { data, error } = await this.auth.refreshSession();
      if (error || !data?.session) return null;
      if (isAnonymous(data.session.user)) return null;
      return toSessionSummary(data.session);
    });
  }

  async signInWithEmail(input: SignInWithEmailInput): Promise<AuthSessionSummary> {
    const { data, error } = await this.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error || !data?.session) {
      throw new AuthRepositoryError(mapAuthError(error), error?.message);
    }

    return toSessionSummary(data.session);
  }

  async signUpWithEmail(
    input: SignUpWithEmailInput
  ): Promise<{ session: AuthSessionSummary; verificationId: string }> {
    const { data, error } = await this.auth.signUp({
      email: input.email,
      password: input.password,
    });

    if (error || !data?.verifyOtp) {
      throw new AuthRepositoryError(mapAuthError(error), error?.message);
    }

    const verificationId = `email:${input.email}`;
    this.pendingVerifications.set(verificationId, data.verifyOtp);

    return {
      session: { userId: '', provider: 'email', email: input.email },
      verificationId,
    };
  }

  async verifyOtp(verificationId: string, code: string): Promise<AuthSessionSummary> {
    const verifyOtp = this.pendingVerifications.get(verificationId);
    if (!verifyOtp) {
      throw new AuthRepositoryError('CHALLENGE_EXPIRED', 'Verification session expired.');
    }

    const { data, error } = await verifyOtp({ token: code });
    this.pendingVerifications.delete(verificationId);

    if (error || !data?.session) {
      throw new AuthRepositoryError(mapAuthError(error), error?.message);
    }

    return toSessionSummary(data.session);
  }

  async startPhoneAuth(
    input: PhoneAuthInput
  ): Promise<{ verificationId: string; retryAfterSeconds: number }> {
    const { data, error } = await this.auth.signInWithOtp({
      phone: input.phone,
      shouldCreateUser: input.shouldCreateUser,
    });

    if (error || !data?.verifyOtp) {
      throw new AuthRepositoryError(mapAuthError(error), error?.message);
    }

    const verificationId = `phone:${input.phone}`;
    this.pendingVerifications.set(verificationId, data.verifyOtp);

    return {
      verificationId,
      retryAfterSeconds: 60,
    };
  }

  async startGithubAuth(input: StartOAuthInput): Promise<{ url: string }> {
    const state = generateRandomState();
    const nonce = generateRandomState();
    saveOAuthState({
      state,
      nonce,
      provider: 'github',
      intent: input.intent,
      returnTo: input.returnTo,
      createdAt: Date.now(),
    });

    const { data, error } = await this.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: input.returnTo,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data?.url) {
      throw new AuthRepositoryError(mapAuthError(error), error?.message);
    }

    // CloudBase generates its own state; we keep ours in sessionStorage for
    // additional validation on callback.
    return { url: data.url };
  }

  async completeOAuthCallback(input: CompleteOAuthInput): Promise<AuthSessionSummary> {
    const { data, error } = await this.auth.verifyOAuth({
      provider: input.provider,
      code: input.code,
      state: input.state,
    });

    if (error || !data?.session) {
      throw new AuthRepositoryError('OAUTH_STATE_INVALID', error?.message);
    }

    return toSessionSummary(data.session);
  }

  async resetPassword(email: string): Promise<void> {
    await this.auth.resetPassword({ email });
  }

  async reauthenticate(password: string): Promise<AuthSessionSummary> {
    const { data, error } = await this.auth.reauthenticate();
    if (error) {
      throw new AuthRepositoryError(mapAuthError(error), error.message);
    }
    // Reauthenticate returns a nonce handle; in a real flow the caller uses
    // data.updateUser or the gateway to verify the password.
    void password;
    void data;
    throw new AuthRepositoryError('NOT_IMPLEMENTED', 'Reauthenticate flow requires handle wiring.');
  }

  async signOut(): Promise<void> {
    const { error } = await this.auth.signOut();
    if (error) {
      throw new AuthRepositoryError(mapAuthError(error), error.message);
    }
  }

  onAuthStateChange(
    callback: (event: string, session: AuthSessionSummary | null) => void
  ): () => void {
    const result = this.auth.onAuthStateChange((event: string, session: { user: CloudBaseAuthUser } & CloudBaseAuthSession) => {
      if (session && !isAnonymous(session.user)) {
        callback(event, toSessionSummary(session));
      } else {
        callback(event, null);
      }
    });

    // SDK returns { data: { subscription: { unsubscribe } } }
    const subscription = (result as unknown as { data: { subscription: { unsubscribe: () => void } } }).data.subscription;
    return () => subscription.unsubscribe();
  }
}

function generateRandomState(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function mapAuthError(error: { code?: string; message?: string } | null | undefined): string {
  const code = error?.code ?? 'UNKNOWN';
  const message = error?.message ?? '';

  if (message.includes('captcha')) return 'CAPTCHA_REQUIRED';
  if (message.includes('rate limit') || message.includes('Rate limit')) return 'RATE_LIMITED';
  if (code === 'invalid_credentials' || code === 'INVALID_CREDENTIALS') return 'INVALID_CREDENTIALS';
  if (code === 'invalid_verification' || code === 'INVALID_VERIFICATION') return 'INVALID_VERIFICATION_CODE';
  return 'SERVICE_TEMPORARILY_UNAVAILABLE';
}

export class AuthRepositoryError extends Error {
  constructor(
    public readonly code: string,
    message?: string
  ) {
    super(message);
    this.name = 'AuthRepositoryError';
  }
}
