/**
 * Demo authentication store (Zustand).
 *
 * A Presentation-layer, in-memory `admin` session with optional Web Storage
 * persistence. There is no backend: `signIn` compares against the fixed demo
 * credentials, `signInWithGithub` simulates OAuth, and registration / recovery
 * only simulate latency. No `fetch`, `window.open`, DI, or IndexedDB is used.
 *
 * All async actions use `try/finally` so `operation` always resets, even when
 * an unexpected error is thrown - a button can never get stuck in loading.
 */
import { create } from 'zustand';

import {
  demoAuthDelayMs,
  demoAuthPassword,
  demoAuthSessionVersion,
  demoAuthUsername,
} from '@/presentation/screens/auth/auth-constants';
import type {
  AuthOperation,
  DemoAuthProvider,
  DemoAuthSession,
  DemoAuthState,
  DemoRegistrationResult,
  DemoRecoveryResult,
} from '@/presentation/screens/auth/auth-types';
import {
  clearDemoAuthSession,
  readDemoAuthSession,
  writeDemoAuthSession,
} from './auth-session-storage';

/** Simulated operation latency. Tests advance fake timers instead of waiting. */
function waitForDemoAuth(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, demoAuthDelayMs);
  });
}

function buildSession(
  provider: DemoAuthProvider,
  remember: boolean
): DemoAuthSession {
  return {
    version: demoAuthSessionVersion,
    user: {
      username: demoAuthUsername,
      provider,
      signedInAt: new Date().toISOString(),
    },
    persistence: remember ? 'local' : 'session',
  };
}

/** Persist a session and translate a storage failure into a warning flag. */
function persistSession(
  session: DemoAuthSession
): { ok: true; session: DemoAuthSession; warning?: 'storage-unavailable' } {
  const writeResult = writeDemoAuthSession(session);
  if (writeResult === 'unavailable') {
    return { ok: true, session, warning: 'storage-unavailable' };
  }
  return { ok: true, session };
}

export const useDemoAuthStore = create<DemoAuthState>((set) => ({
  // Seed synchronously so the UI never flashes guest-then-admin.
  session: readDemoAuthSession(),
  operation: null,
  error: null,

  signIn: async (input) => {
    set({ operation: 'login' as AuthOperation, error: null });
    try {
      await waitForDemoAuth();
      // Username is trimmed; password is not, so trailing spaces surface as errors.
      const username = input.username.trim();
      if (username !== demoAuthUsername || input.password !== demoAuthPassword) {
        set({ error: 'invalid-credentials' });
        return { ok: false, code: 'invalid-credentials' } as const;
      }
      const session = buildSession('credentials', input.remember);
      // Persist first: an unexpected write error must NOT leave a session set,
      // while a clean `unavailable` return still keeps the in-memory session.
      const result = persistSession(session);
      set({ session });
      return result;
    } finally {
      set({ operation: null });
    }
  },

  signInWithGithub: async (remember) => {
    set({ operation: 'github' as AuthOperation, error: null });
    try {
      await waitForDemoAuth();
      const session = buildSession('github', remember);
      const result = persistSession(session);
      set({ session });
      return result;
    } finally {
      set({ operation: null });
    }
  },

  simulateRegistration: async (): Promise<DemoRegistrationResult> => {
    set({ operation: 'signup' as AuthOperation, error: null });
    try {
      await waitForDemoAuth();
      // No real account is created; no session, no storage write.
      return { ok: true, suggestedUsername: demoAuthUsername };
    } finally {
      set({ operation: null });
    }
  },

  simulateRecovery: async (): Promise<DemoRecoveryResult> => {
    set({ operation: 'recovery' as AuthOperation, error: null });
    try {
      await waitForDemoAuth();
      // No mail is sent; no session, no storage write.
      return { ok: true, suggestedUsername: demoAuthUsername };
    } finally {
      set({ operation: null });
    }
  },

  clearError: () => set({ error: null }),

  signOut: () => {
    clearDemoAuthSession();
    set({ session: null, operation: null, error: null });
  },
}));
