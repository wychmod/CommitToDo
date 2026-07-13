/**
 * Dual Web Storage adapter for the demo auth session.
 *
 * A session is persisted to exactly ONE of localStorage (remember me) or
 * sessionStorage (this tab only). Switching modes clears the other store so
 * there is always a single source of truth. Corrupt or schema-invalid records
 * are deleted on read rather than trusted.
 *
 * Only `DemoAuthSession` is ever serialized - there is deliberately no path
 * for `password`, `token` or `refreshToken` to reach storage.
 */
import { demoAuthStorageKey } from '@/presentation/screens/auth/auth-constants';
import type { DemoAuthSession } from '@/presentation/screens/auth/auth-types';

export function isDemoAuthSession(
  value: unknown
): value is DemoAuthSession {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.version !== 1) return false;
  if (v.persistence !== 'local' && v.persistence !== 'session') return false;

  const user = v.user;
  if (typeof user !== 'object' || user === null) return false;
  const u = user as Record<string, unknown>;
  if (u.username !== 'admin') return false;
  if (u.provider !== 'credentials' && u.provider !== 'github') return false;
  if (typeof u.signedInAt !== 'string') return false;
  if (Number.isNaN(Date.parse(u.signedInAt))) return false;

  return true;
}

/** Read & validate a single storage; deletes corrupt/invalid records. */
function readFromStorage(storage: Storage): DemoAuthSession | null {
  const raw = storage.getItem(demoAuthStorageKey);
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    storage.removeItem(demoAuthStorageKey);
    return null;
  }

  if (!isDemoAuthSession(parsed)) {
    storage.removeItem(demoAuthStorageKey);
    return null;
  }
  return parsed;
}

export function readDemoAuthSession(): DemoAuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    // sessionStorage wins when both somehow hold a record.
    const fromSession = readFromStorage(window.sessionStorage);
    if (fromSession) return fromSession;
    return readFromStorage(window.localStorage);
  } catch {
    return null;
  }
}

export function writeDemoAuthSession(
  session: DemoAuthSession
): 'ok' | 'unavailable' {
  if (typeof window === 'undefined') return 'unavailable';
  try {
    // Clear both stores first so persistence switches leave no stale record.
    window.localStorage.removeItem(demoAuthStorageKey);
    window.sessionStorage.removeItem(demoAuthStorageKey);

    const storage =
      session.persistence === 'local'
        ? window.localStorage
        : window.sessionStorage;
    storage.setItem(demoAuthStorageKey, JSON.stringify(session));
    return 'ok';
  } catch {
    return 'unavailable';
  }
}

export function clearDemoAuthSession(): void {
  if (typeof window === 'undefined') return;
  // Clear each store independently so a failure on one does not skip the other.
  try {
    window.localStorage.removeItem(demoAuthStorageKey);
  } catch {
    // ignore - clearing must not block in-memory logout
  }
  try {
    window.sessionStorage.removeItem(demoAuthStorageKey);
  } catch {
    // ignore
  }
}
