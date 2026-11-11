/**
 * Commit application profile for the authenticated principal.
 */

import type { AuthIdentity } from './auth-identity';

export interface UserProfile {
  principalId: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  locale: string;
  securityVersion: number;
  identities: AuthIdentity[];
}
