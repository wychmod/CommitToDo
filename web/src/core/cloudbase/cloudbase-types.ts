/**
 * Thin type contracts for the CloudBase Web SDK auth surface.
 *
 * These types are derived from the installed @cloudbase/js-sdk declarations
 * and the PoC results. Presentation code must not depend on this module.
 */

export interface CloudBaseAuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  user: CloudBaseAuthUser;
}

export interface CloudBaseAuthUser {
  id: string;
  aud: string;
  role: string[];
  email: string | null;
  email_confirmed_at: string | null;
  phone: string | null;
  phone_confirmed_at: string | null;
  confirmed_at: string | null;
  last_sign_in_at: string | null;
  app_metadata: {
    provider: string | null;
    providers: string[];
  };
  user_metadata: {
    name?: string | null;
    picture?: string | null;
    username?: string | null;
    nickName?: string | null;
    avatarUrl?: string | null;
  };
  identities: CloudBaseUserIdentity[];
  created_at: string;
  updated_at: string;
  is_anonymous: boolean;
}

export interface CloudBaseUserIdentity {
  id: string;
  user_id: string;
  identity_data?: Record<string, unknown>;
  provider: string;
  last_sign_in_at: string;
  created_at: string;
  updated_at: string;
}

export interface CloudBaseOtpResponse {
  verifyOtp: (input: { token: string }) => Promise<{ data?: { user: CloudBaseAuthUser; session: CloudBaseAuthSession }; error: CloudBaseAuthError | null }>;
}

export interface CloudBaseAuthError {
  message: string;
  code?: string;
  status?: number;
}

export type CloudBaseAuthChangeEvent =
  | 'INITIAL_SESSION'
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'
  | 'PASSWORD_RECOVERY'
  | 'BIND_IDENTITY';
