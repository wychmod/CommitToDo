import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { demoAuthDelayMs } from '@/presentation/screens/auth/auth-constants';
import { selectIsAuthenticated } from '@/presentation/screens/auth/auth-types';
import type { DemoAuthSession } from '@/presentation/screens/auth/auth-types';

// Mock the storage adapter so we can drive init, write results and exceptions
// without touching real Web Storage. `vi.hoisted` guarantees the fns exist
// before the (hoisted) vi.mock factory runs.
const mocks = vi.hoisted(() => ({
  read: vi.fn().mockReturnValue(null),
  write: vi.fn().mockReturnValue('ok' as const),
  clear: vi.fn(),
}));

vi.mock('@/presentation/stores/auth-session-storage', () => ({
  readDemoAuthSession: () => mocks.read(),
  writeDemoAuthSession: (session: DemoAuthSession) => mocks.write(session),
  clearDemoAuthSession: () => mocks.clear(),
  isDemoAuthSession: () => true,
}));

import { useDemoAuthStore } from './demo-auth-store';

function makeSession(
  persistence: 'local' | 'session' = 'local',
  provider: 'credentials' | 'github' = 'credentials'
): DemoAuthSession {
  return {
    version: 1,
    user: {
      username: 'admin',
      provider,
      signedInAt: '2026-07-14T00:00:00.000Z',
    },
    persistence,
  };
}

function resetStore(): void {
  useDemoAuthStore.setState({ session: null, operation: null, error: null });
}

describe('demo-auth-store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetStore();
    mocks.read.mockReset();
    mocks.read.mockReturnValue(null);
    mocks.write.mockReset();
    mocks.write.mockReturnValue('ok');
    mocks.clear.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('seeds the session from readDemoAuthSession on creation', async () => {
      const session = makeSession('local');
      mocks.read.mockReturnValue(session);
      vi.resetModules();
      const { useDemoAuthStore: freshStore } = await import('./demo-auth-store');

      expect(freshStore.getState().session).toEqual(session);
      expect(selectIsAuthenticated(freshStore.getState())).toBe(true);
    });

    it('starts as guest when storage has no session', async () => {
      mocks.read.mockReturnValue(null);
      vi.resetModules();
      const { useDemoAuthStore: freshStore } = await import('./demo-auth-store');

      expect(freshStore.getState().session).toBeNull();
      expect(selectIsAuthenticated(freshStore.getState())).toBe(false);
    });
  });

  describe('signIn', () => {
    it('sets operation=login during the delay and resets after', async () => {
      const promise = useDemoAuthStore
        .getState()
        .signIn({ username: 'admin', password: 'admin', remember: true });

      expect(useDemoAuthStore.getState().operation).toBe('login');

      await vi.advanceTimersByTimeAsync(demoAuthDelayMs);
      await promise;

      expect(useDemoAuthStore.getState().operation).toBeNull();
    });

    it('succeeds for admin/admin with provider=credentials', async () => {
      const promise = useDemoAuthStore
        .getState()
        .signIn({ username: 'admin', password: 'admin', remember: true });

      await vi.advanceTimersByTimeAsync(demoAuthDelayMs);
      const result = await promise;

      expect(result).toEqual({ ok: true, session: expect.any(Object) });
      if (result.ok) {
        expect(result.session.user.username).toBe('admin');
        expect(result.session.user.provider).toBe('credentials');
        expect(result.session.version).toBe(1);
        expect(result.session.user.signedInAt).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
        );
      }
      expect(useDemoAuthStore.getState().session?.user.provider).toBe(
        'credentials'
      );
    });

    it('trims the username but not the password', async () => {
      const promise = useDemoAuthStore
        .getState()
        .signIn({
          username: '  admin  ',
          password: 'admin',
          remember: true,
        });

      await vi.advanceTimersByTimeAsync(demoAuthDelayMs);
      const result = await promise;

      expect(result.ok).toBe(true);

      const failPromise = useDemoAuthStore
        .getState()
        .signIn({ username: 'admin', password: ' admin', remember: true });

      await vi.advanceTimersByTimeAsync(demoAuthDelayMs);
      const failResult = await failPromise;

      expect(failResult).toEqual({ ok: false, code: 'invalid-credentials' });
    });

    it('returns invalid-credentials and keeps no session for wrong creds', async () => {
      const promise = useDemoAuthStore
        .getState()
        .signIn({ username: 'wrong', password: 'wrong', remember: true });

      await vi.advanceTimersByTimeAsync(demoAuthDelayMs);
      const result = await promise;

      expect(result).toEqual({ ok: false, code: 'invalid-credentials' });
      expect(useDemoAuthStore.getState().session).toBeNull();
      expect(useDemoAuthStore.getState().error).toBe('invalid-credentials');
    });

    it('persists to localStorage when remember=true', async () => {
      const promise = useDemoAuthStore
        .getState()
        .signIn({ username: 'admin', password: 'admin', remember: true });

      await vi.advanceTimersByTimeAsync(demoAuthDelayMs);
      await promise;

      expect(mocks.write).toHaveBeenCalledTimes(1);
      const session = mocks.write.mock.calls[0][0] as DemoAuthSession;
      expect(session.persistence).toBe('local');
    });

    it('persists to sessionStorage when remember=false', async () => {
      const promise = useDemoAuthStore
        .getState()
        .signIn({ username: 'admin', password: 'admin', remember: false });

      await vi.advanceTimersByTimeAsync(demoAuthDelayMs);
      await promise;

      const session = mocks.write.mock.calls[0][0] as DemoAuthSession;
      expect(session.persistence).toBe('session');
    });

    it('keeps the in-memory session and warns when storage is unavailable', async () => {
      mocks.write.mockReturnValue('unavailable');

      const promise = useDemoAuthStore
        .getState()
        .signIn({ username: 'admin', password: 'admin', remember: true });

      await vi.advanceTimersByTimeAsync(demoAuthDelayMs);
      const result = await promise;

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.warning).toBe('storage-unavailable');
      expect(useDemoAuthStore.getState().session).not.toBeNull();
    });

    it('resets operation even when an unexpected error is thrown', async () => {
      mocks.write.mockImplementation(() => {
        throw new Error('boom');
      });

      const promise = useDemoAuthStore
        .getState()
        .signIn({ username: 'admin', password: 'admin', remember: true });
      // Pre-attach a handler so flushing fake timers does not report an
      // unhandled rejection before the assertion below runs.
      promise.catch(() => {});

      await vi.advanceTimersByTimeAsync(demoAuthDelayMs);
      await expect(promise).rejects.toThrow('boom');

      expect(useDemoAuthStore.getState().operation).toBeNull();
      expect(useDemoAuthStore.getState().session).toBeNull();
    });
  });

  describe('signInWithGithub', () => {
    it('creates a github provider session without network calls', async () => {
      const promise = useDemoAuthStore.getState().signInWithGithub(true);

      expect(useDemoAuthStore.getState().operation).toBe('github');

      await vi.advanceTimersByTimeAsync(demoAuthDelayMs);
      const result = await promise;

      expect(result.ok).toBe(true);
      expect(useDemoAuthStore.getState().session?.user.provider).toBe('github');
      expect(useDemoAuthStore.getState().session?.user.username).toBe('admin');
      expect(useDemoAuthStore.getState().operation).toBeNull();
    });

    it('honors the remember flag for persistence', async () => {
      const promise = useDemoAuthStore.getState().signInWithGithub(false);

      await vi.advanceTimersByTimeAsync(demoAuthDelayMs);
      await promise;

      const session = mocks.write.mock.calls[0][0] as DemoAuthSession;
      expect(session.persistence).toBe('session');
    });
  });

  describe('simulateRegistration', () => {
    it('runs the signup operation without creating a session', async () => {
      const promise = useDemoAuthStore.getState().simulateRegistration();

      expect(useDemoAuthStore.getState().operation).toBe('signup');

      await vi.advanceTimersByTimeAsync(demoAuthDelayMs);
      const result = await promise;

      expect(result).toEqual({ ok: true, suggestedUsername: 'admin' });
      expect(useDemoAuthStore.getState().session).toBeNull();
      expect(useDemoAuthStore.getState().operation).toBeNull();
      expect(mocks.write).not.toHaveBeenCalled();
    });
  });

  describe('simulateRecovery', () => {
    it('runs the recovery operation without creating a session or writing storage', async () => {
      const promise = useDemoAuthStore.getState().simulateRecovery();

      expect(useDemoAuthStore.getState().operation).toBe('recovery');

      await vi.advanceTimersByTimeAsync(demoAuthDelayMs);
      const result = await promise;

      expect(result).toEqual({ ok: true, suggestedUsername: 'admin' });
      expect(useDemoAuthStore.getState().session).toBeNull();
      expect(mocks.write).not.toHaveBeenCalled();
    });
  });

  describe('clearError', () => {
    it('clears the error code', () => {
      useDemoAuthStore.setState({ error: 'invalid-credentials' });

      useDemoAuthStore.getState().clearError();

      expect(useDemoAuthStore.getState().error).toBeNull();
    });
  });

  describe('signOut', () => {
    it('clears the session and auth storage but not business data', async () => {
      const promise = useDemoAuthStore
        .getState()
        .signIn({ username: 'admin', password: 'admin', remember: true });
      await vi.advanceTimersByTimeAsync(demoAuthDelayMs);
      await promise;
      expect(useDemoAuthStore.getState().session).not.toBeNull();

      useDemoAuthStore.getState().signOut();

      expect(useDemoAuthStore.getState().session).toBeNull();
      expect(useDemoAuthStore.getState().operation).toBeNull();
      expect(useDemoAuthStore.getState().error).toBeNull();
      expect(mocks.clear).toHaveBeenCalledTimes(1);
    });
  });

  describe('selectIsAuthenticated', () => {
    it('derives solely from the session', () => {
      expect(selectIsAuthenticated(useDemoAuthStore.getState())).toBe(false);

      useDemoAuthStore.setState({ session: makeSession('local') });

      expect(selectIsAuthenticated(useDemoAuthStore.getState())).toBe(true);
    });
  });
});
