/**
 * Application-level auth security repository.
 *
 * Used for profile bootstrap, identity binding, security events and merge
 * requests. Calls the Auth Gateway or CloudBase PG via trusted endpoints.
 */

import type { AuthChallenge, AuthChallengeResult } from '../entities/auth-challenge';
import type { UserProfile } from '../entities/user-profile';

export interface RequestChallengeInput {
  purpose: 'signup' | 'signin' | 'bind' | 'recovery';
  channel: 'sms' | 'email';
  target: string;
  captchaToken?: string;
}

export interface VerifyChallengeInput {
  challengeId: string;
  code: string;
}

export interface BindPhoneInput {
  phone: string;
  verificationId: string;
  code: string;
}

export interface SecurityEvent {
  id: string;
  eventType: string;
  riskLevel: 'info' | 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
}

export interface IAuthSecurityRepository {
  requestChallenge(input: RequestChallengeInput): Promise<AuthChallenge>;
  verifyChallenge(input: VerifyChallengeInput): Promise<AuthChallengeResult>;
  bootstrapProfile(): Promise<UserProfile>;
  getCurrentProfile(): Promise<UserProfile>;
  bindPhone(input: BindPhoneInput): Promise<UserProfile>;
  listSecurityEvents(): Promise<SecurityEvent[]>;
}
