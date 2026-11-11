import {
  consumeOAuthState,
  saveOAuthState,
  type OAuthStateRecord,
} from './oauth-state-storage';

const record: OAuthStateRecord = {
  state: 'state-1',
  nonce: 'nonce-1',
  provider: 'github',
  intent: 'login',
  returnTo: '/workspace',
  createdAt: Date.now(),
};

beforeEach(() => {
  sessionStorage.clear();
});

it('consumes a state only once', () => {
  saveOAuthState(record);

  expect(consumeOAuthState(record.state)).toEqual(record);
  expect(consumeOAuthState(record.state)).toBeNull();
});

it('rejects expired state records', () => {
  vi.useFakeTimers();
  try {
    saveOAuthState(record);
    vi.advanceTimersByTime(10 * 60 * 1000 + 1);
    expect(consumeOAuthState(record.state)).toBeNull();
  } finally {
    vi.useRealTimers();
  }
});
