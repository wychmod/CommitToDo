/// <reference types="vitest/globals" />
import 'reflect-metadata';
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';

// Provide a minimal CloudBase configuration so importing the auth store (which
// eagerly constructs the CloudBase repository) does not throw in tests. No
// network calls are made at init time; individual methods are mocked per test.
vi.stubEnv('VITE_CLOUDBASE_ENV_ID', 'test-env-id');
vi.stubEnv('VITE_CLOUDBASE_PUBLISHABLE_KEY', 'test-publishable-key');
vi.stubEnv('VITE_CLOUDBASE_REGION', 'ap-shanghai');

// Mock the CloudBase Web SDK so tests run in jsdom without the Node-only build
// (which depends on @cloudbase/signature-nodejs, not installed in this repo).
// Per-test store methods are overridden where needed; the auth surface below
// only has to satisfy the repository constructor.
vi.mock('@cloudbase/js-sdk', () => {
  const auth = {
    getSession: vi.fn(),
    refreshSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signInWithOtp: vi.fn(),
    signInWithOAuth: vi.fn(),
    verifyOAuth: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  };
  return {
    default: {
      init: () => ({ auth }),
    },
  };
});


class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock;

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
