const authMock = vi.hoisted(() => ({
  getSession: vi.fn(),
  refreshSession: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signInWithOtp: vi.fn(),
  signInWithOAuth: vi.fn(),
  verifyOAuth: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  reauthenticate: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock('@/core/cloudbase/cloudbase-client', () => ({
  getCloudBaseAuth: () => authMock,
}));

import { consumeOAuthState } from '@/core/auth/oauth-state-storage';
import { CloudBaseAuthRepository, AuthRepositoryError } from './cloudbase-auth-repository';

function session(isAnonymous = false) {
  return {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_in: 3600,
    expires_at: 123,
    user: {
      id: 'user-1',
      is_anonymous: isAnonymous,
      email: 'user@example.com',
      app_metadata: { provider: 'email', providers: ['email'] },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  authMock.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
});

it('accepts only real non-anonymous sessions', async () => {
  authMock.getSession
    .mockResolvedValueOnce({ data: { session: session(true) }, error: null })
    .mockResolvedValueOnce({ data: { session: session(false) }, error: null });
  const repository = new CloudBaseAuthRepository();

  await expect(repository.getSession()).resolves.toBeNull();
  await expect(repository.getSession()).resolves.toMatchObject({ userId: 'user-1' });
});

it('uses the v3 password contract and maps failures without leaking provider details', async () => {
  authMock.signInWithPassword.mockResolvedValue({
    data: { session: session(false) },
    error: null,
  });
  const repository = new CloudBaseAuthRepository();

  await repository.signInWithEmail({ email: 'user@example.com', password: 'secret' });
  expect(authMock.signInWithPassword).toHaveBeenCalledWith({
    email: 'user@example.com',
    password: 'secret',
  });

  authMock.signInWithPassword.mockResolvedValue({
    data: null,
    error: { code: 'invalid_credentials', message: 'provider detail' },
  });
  await expect(repository.signInWithEmail({ email: 'x@y.z', password: 'secret' }))
    .rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
});

it('stores the SDK-generated OAuth state for one-time callback validation', async () => {
  authMock.signInWithOAuth.mockResolvedValue({
    data: { url: 'https://github.com/login?state=sdk-state-1' },
    error: null,
  });
  const repository = new CloudBaseAuthRepository();

  await repository.startGithubAuth({
    provider: 'github',
    intent: 'login',
    returnTo: '/workspace',
  });

  expect(consumeOAuthState('sdk-state-1')).toMatchObject({
    provider: 'github',
    returnTo: '/workspace',
  });
  expect(authMock.signInWithOAuth).toHaveBeenCalledWith(expect.objectContaining({
    provider: 'github',
    options: expect.objectContaining({ skipBrowserRedirect: true }),
  }));
});

it('uses the v3 password-recovery method', async () => {
  const updateUser = vi.fn().mockResolvedValue({
    data: { session: session(false) },
    error: null,
  });
  authMock.resetPasswordForEmail.mockResolvedValue({
    data: { updateUser },
    error: null,
  });
  const repository = new CloudBaseAuthRepository();

  await repository.requestPasswordReset('user@example.com');
  await expect(repository.completePasswordReset({
    email: 'user@example.com',
    code: '123456',
    password: 'new-password-123',
  })).resolves.toMatchObject({ userId: 'user-1' });
  expect(authMock.resetPasswordForEmail).toHaveBeenCalledWith('user@example.com');
  expect(updateUser).toHaveBeenCalledWith({
    nonce: '123456',
    password: 'new-password-123',
  });
  expect(AuthRepositoryError).toBeDefined();
});
