import { beforeEach, describe, expect, it, vi } from 'vitest';

import { demoAuthStorageKey } from '@/presentation/screens/auth/auth-constants';
import type { DemoAuthSession } from '@/presentation/screens/auth/auth-types';

import {
  clearDemoAuthSession,
  isDemoAuthSession,
  readDemoAuthSession,
  writeDemoAuthSession,
} from './auth-session-storage';

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

function setRaw(storage: Storage, value: unknown): void {
  storage.setItem(demoAuthStorageKey, JSON.stringify(value));
}

describe('auth-session-storage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('isDemoAuthSession', () => {
    it('accepts a valid session', () => {
      expect(isDemoAuthSession(makeSession())).toBe(true);
    });

    it('accepts a github provider session', () => {
      expect(isDemoAuthSession(makeSession('session', 'github'))).toBe(true);
    });

    it.each([
      ['null', null],
      ['a string', 'admin'],
      ['an array', []],
    ])('rejects %s', (_label, value) => {
      expect(isDemoAuthSession(value)).toBe(false);
    });

    it('rejects a wrong version', () => {
      expect(isDemoAuthSession({ ...makeSession(), version: 2 })).toBe(false);
    });

    it('rejects a string version', () => {
      expect(isDemoAuthSession({ ...makeSession(), version: '1' })).toBe(false);
    });

    it('rejects a non-admin username', () => {
      expect(
        isDemoAuthSession({
          ...makeSession(),
          user: { ...makeSession().user, username: 'bob' },
        })
      ).toBe(false);
    });

    it('rejects an unknown provider', () => {
      expect(
        isDemoAuthSession({
          ...makeSession(),
          user: { ...makeSession().user, provider: 'oauth' },
        })
      ).toBe(false);
    });

    it('rejects an invalid signedInAt date', () => {
      expect(
        isDemoAuthSession({
          ...makeSession(),
          user: { ...makeSession().user, signedInAt: 'not-a-date' },
        })
      ).toBe(false);
    });

    it('rejects an unknown persistence', () => {
      expect(
        isDemoAuthSession({ ...makeSession(), persistence: 'cookie' })
      ).toBe(false);
    });
  });

  describe('writeDemoAuthSession / readDemoAuthSession', () => {
    it('reads null when no session is stored', () => {
      expect(readDemoAuthSession()).toBeNull();
    });

    it('writes a local session only to localStorage', () => {
      const result = writeDemoAuthSession(makeSession('local'));

      expect(result).toBe('ok');
      expect(localStorage.getItem(demoAuthStorageKey)).not.toBeNull();
      expect(sessionStorage.getItem(demoAuthStorageKey)).toBeNull();
      expect(readDemoAuthSession()).toEqual(makeSession('local'));
    });

    it('writes a session session only to sessionStorage', () => {
      const result = writeDemoAuthSession(makeSession('session'));

      expect(result).toBe('ok');
      expect(sessionStorage.getItem(demoAuthStorageKey)).not.toBeNull();
      expect(localStorage.getItem(demoAuthStorageKey)).toBeNull();
      expect(readDemoAuthSession()).toEqual(makeSession('session'));
    });

    it('switching from local to session clears the old local record', () => {
      writeDemoAuthSession(makeSession('local'));
      expect(localStorage.getItem(demoAuthStorageKey)).not.toBeNull();

      writeDemoAuthSession(makeSession('session'));

      expect(localStorage.getItem(demoAuthStorageKey)).toBeNull();
      expect(sessionStorage.getItem(demoAuthStorageKey)).not.toBeNull();
    });

    it('switching from session to local clears the old session record', () => {
      writeDemoAuthSession(makeSession('session'));
      expect(sessionStorage.getItem(demoAuthStorageKey)).not.toBeNull();

      writeDemoAuthSession(makeSession('local'));

      expect(sessionStorage.getItem(demoAuthStorageKey)).toBeNull();
      expect(localStorage.getItem(demoAuthStorageKey)).not.toBeNull();
    });

    it('prefers sessionStorage over localStorage when both hold a record', () => {
      // Defensive: dual-clear should prevent this, but read must still be stable.
      setRaw(sessionStorage, makeSession('session'));
      setRaw(localStorage, makeSession('local'));

      const result = readDemoAuthSession();

      expect(result?.persistence).toBe('session');
    });

    it('deletes a corrupt sessionStorage record and falls through to localStorage', () => {
      sessionStorage.setItem(demoAuthStorageKey, '{not valid json');
      setRaw(localStorage, makeSession('local'));

      const result = readDemoAuthSession();

      expect(result).toEqual(makeSession('local'));
      expect(sessionStorage.getItem(demoAuthStorageKey)).toBeNull();
    });

    it('deletes corrupt records in both storages and returns null', () => {
      sessionStorage.setItem(demoAuthStorageKey, '{not valid json');
      localStorage.setItem(demoAuthStorageKey, 'also broken');

      expect(readDemoAuthSession()).toBeNull();
      expect(sessionStorage.getItem(demoAuthStorageKey)).toBeNull();
      expect(localStorage.getItem(demoAuthStorageKey)).toBeNull();
    });

    it('deletes a schema-invalid record and returns null', () => {
      setRaw(localStorage, { ...makeSession(), version: 99 });

      expect(readDemoAuthSession()).toBeNull();
      expect(localStorage.getItem(demoAuthStorageKey)).toBeNull();
    });

    it('returns unavailable when storage.setItem throws', () => {
      const spy = vi
        .spyOn(Storage.prototype, 'setItem')
        .mockImplementation(() => {
          throw new Error('QuotaExceededError');
        });

      const result = writeDemoAuthSession(makeSession('local'));

      expect(result).toBe('unavailable');
      expect(localStorage.getItem(demoAuthStorageKey)).toBeNull();
      expect(sessionStorage.getItem(demoAuthStorageKey)).toBeNull();
      spy.mockRestore();
    });

    it('never serializes password, token or refreshToken', () => {
      writeDemoAuthSession(makeSession('local'));

      const raw = localStorage.getItem(demoAuthStorageKey) ?? '';
      expect(raw).not.toMatch(/password/i);
      expect(raw).not.toMatch(/token/i);
      expect(raw).not.toMatch(/refreshToken/i);
    });
  });

  describe('clearDemoAuthSession', () => {
    it('removes the auth key from both storages', () => {
      setRaw(localStorage, makeSession('local'));
      setRaw(sessionStorage, makeSession('session'));

      clearDemoAuthSession();

      expect(localStorage.getItem(demoAuthStorageKey)).toBeNull();
      expect(sessionStorage.getItem(demoAuthStorageKey)).toBeNull();
    });

    it('does not touch unrelated storage keys', () => {
      localStorage.setItem('commit-settings', '{"isDarkMode":true}');
      sessionStorage.setItem('some-other-key', 'keep-me');
      setRaw(localStorage, makeSession('local'));

      clearDemoAuthSession();

      expect(localStorage.getItem('commit-settings')).toBe(
        '{"isDarkMode":true}'
      );
      expect(sessionStorage.getItem('some-other-key')).toBe('keep-me');
    });
  });
});
