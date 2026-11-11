/**
 * Domain representation of an authenticated session.
 *
 * Does NOT include raw access/refresh tokens. Token persistence is left to
 * the CloudBase SDK.
 */

export interface AuthSessionSummary {
  userId: string;
  expiresAt?: number;
  provider: string;
  email?: string | null;
}

export type AuthSessionStatus = 'initializing' | 'authenticated' | 'guest' | 'error';
