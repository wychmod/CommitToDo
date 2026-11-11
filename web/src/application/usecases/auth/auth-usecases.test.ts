import { SignInWithEmailUseCase } from './sign-in-with-email-usecase';
import { VerifyPhoneAuthUseCase } from './verify-phone-auth-usecase';
import type { IAuthRepository } from '@/domain/repositories/i-auth-repository';
import type { IAuthSecurityRepository } from '@/domain/repositories/i-auth-security-repository';

function authRepository(overrides: Partial<IAuthRepository> = {}): IAuthRepository {
  return {
    getSession: async () => null,
    refreshSession: async () => null,
    signInWithEmail: async () => ({ userId: 'u1', provider: 'email' }),
    signUpWithEmail: async () => ({ session: { userId: '', provider: 'email' }, verificationId: 'v1' }),
    verifyOtp: async () => ({ userId: 'u1', provider: 'phone' }),
    startPhoneAuth: async () => ({ verificationId: 'v1', retryAfterSeconds: 60 }),
    startGithubAuth: async () => ({ url: 'https://example.com' }),
    completeOAuthCallback: async () => ({ userId: 'u1', provider: 'github' }),
    requestPasswordReset: async () => undefined,
    completePasswordReset: async () => ({ userId: 'u1', provider: 'email' }),
    reauthenticate: async () => ({ userId: 'u1', provider: 'email' }),
    signOut: async () => undefined,
    onAuthStateChange: () => () => undefined,
    ...overrides,
  };
}

function securityRepository(overrides: Partial<IAuthSecurityRepository> = {}): IAuthSecurityRepository {
  return {
    requestChallenge: async () => ({ id: 'c1', challengeId: 'c1', purpose: 'signin', channel: 'sms', retryAfterSeconds: 60 }),
    verifyChallenge: async () => ({ verified: true }),
    bootstrapProfile: async () => ({ principalId: 'p1', email: null, displayName: null, avatarUrl: null, locale: 'zh-CN', securityVersion: 1, identities: [] }),
    getCurrentProfile: async () => ({ principalId: 'p1', email: null, displayName: null, avatarUrl: null, locale: 'zh-CN', securityVersion: 1, identities: [] }),
    bindPhone: async () => ({ principalId: 'p1', email: null, displayName: null, avatarUrl: null, locale: 'zh-CN', securityVersion: 1, identities: [] }),
    listSecurityEvents: async () => [],
    ...overrides,
  };
}

it('bootstraps the profile after a successful email sign-in', async () => {
  const bootstrapProfile = vi.fn(async () => securityRepository().bootstrapProfile());
  const useCase = new SignInWithEmailUseCase(
    authRepository(),
    securityRepository({ bootstrapProfile })
  );

  await expect(useCase.execute({ email: 'user@example.com', password: 'long-password' }))
    .resolves.toMatchObject({ userId: 'u1' });
  expect(bootstrapProfile).toHaveBeenCalledOnce();
});

it('verifies the gateway challenge before accepting a phone OTP', async () => {
  const calls: string[] = [];
  const useCase = new VerifyPhoneAuthUseCase(
    authRepository({ verifyOtp: async () => { calls.push('otp'); return { userId: 'u1', provider: 'phone' }; } }),
    securityRepository({ verifyChallenge: async () => { calls.push('challenge'); return { verified: true }; } })
  );

  await useCase.execute({ verificationId: 'c1', code: '123456' });
  expect(calls).toEqual(['challenge', 'otp']);
});
