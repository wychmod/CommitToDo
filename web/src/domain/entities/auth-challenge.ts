/**
 * A verification challenge issued by the Auth Gateway.
 */

export type ChallengePurpose = 'signup' | 'signin' | 'bind' | 'recovery';
export type ChallengeChannel = 'sms' | 'email';

export interface AuthChallenge {
  id: string;
  challengeId: string;
  purpose: ChallengePurpose;
  channel: ChallengeChannel;
  retryAfterSeconds: number;
}

export interface AuthChallengeResult {
  verified: boolean;
}
