/**
 * A single login identity (email, phone, GitHub) attached to a principal.
 */

export type AuthProvider = 'email' | 'phone' | 'github';

export interface AuthIdentity {
  id: string;
  provider: AuthProvider;
  providerSubject: string;
  identifierMasked: string | null;
  isPrimary: boolean;
  verifiedAt: string;
  lastUsedAt: string | null;
}
