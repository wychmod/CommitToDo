/**
 * OAuth state storage with TTL and one-time use.
 *
 * State records live for at most 10 minutes and are deleted on first read.
 */

const STORAGE_KEY = 'commit:oauth:state';
const TTL_MS = 10 * 60 * 1000;

export interface OAuthStateRecord {
  state: string;
  nonce: string;
  provider: 'github';
  intent: 'login' | 'signup';
  returnTo: string;
  createdAt: number;
}

interface StoragePayload {
  records: OAuthStateRecord[];
}

function readStorage(): StoragePayload {
  if (typeof window === 'undefined') return { records: [] };
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { records: [] };
    const parsed = JSON.parse(raw) as StoragePayload;
    return { records: Array.isArray(parsed.records) ? parsed.records : [] };
  } catch {
    return { records: [] };
  }
}

function writeStorage(payload: StoragePayload): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage unavailable is non-fatal; state validation will fail later.
  }
}

export function saveOAuthState(record: OAuthStateRecord): void {
  const payload = readStorage();
  const now = Date.now();
  payload.records = payload.records
    .filter((r) => r.createdAt + TTL_MS > now)
    .concat(record);
  writeStorage(payload);
}

export function consumeOAuthState(state: string): OAuthStateRecord | null {
  const payload = readStorage();
  const now = Date.now();
  const matchIndex = payload.records.findIndex(
    (r) => r.state === state && r.createdAt + TTL_MS > now
  );

  if (matchIndex === -1) return null;

  const [match] = payload.records.splice(matchIndex, 1);
  payload.records = payload.records.filter((r) => r.createdAt + TTL_MS > now);
  writeStorage(payload);
  return match ?? null;
}
