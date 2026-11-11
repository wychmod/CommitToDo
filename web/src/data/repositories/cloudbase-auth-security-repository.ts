/**
 * Application auth security repository — calls the Auth Gateway.
 *
 * This is a skeleton implementation. The Auth Gateway endpoints must be
 * deployed and configured (AUTH_GATEWAY_URL env variable) before sensitive
 * operations work.
 */

import { injectable } from 'tsyringe';

import { getCloudBaseAuth } from '@/core/cloudbase/cloudbase-client';
import type { AuthChallenge, AuthChallengeResult } from '@/domain/entities/auth-challenge';
import type { UserProfile } from '@/domain/entities/user-profile';
import {
  type IAuthSecurityRepository,
  type RequestChallengeInput,
  type VerifyChallengeInput,
  type BindPhoneInput,
  type SecurityEvent,
} from '@/domain/repositories/i-auth-security-repository';

const GATEWAY_URL = import.meta.env.VITE_AUTH_GATEWAY_URL as string | undefined;

@injectable()
export class CloudBaseAuthSecurityRepository implements IAuthSecurityRepository {
  async requestChallenge(input: RequestChallengeInput): Promise<AuthChallenge> {
    const idempotencyKey =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return this.post<AuthChallenge>('/v1/auth/challenges', input, idempotencyKey);
  }

  async verifyChallenge(input: VerifyChallengeInput): Promise<AuthChallengeResult> {
    return this.post<AuthChallengeResult>(`/v1/auth/challenges/${input.challengeId}/verify`, {
      code: input.code,
    });
  }

  async bootstrapProfile(): Promise<UserProfile> {
    return this.post<UserProfile>('/v1/auth/profile/bootstrap', {});
  }

  async getCurrentProfile(): Promise<UserProfile> {
    return this.get<UserProfile>('/v1/auth/me');
  }

  async bindPhone(input: BindPhoneInput): Promise<UserProfile> {
    return this.post<UserProfile>('/v1/auth/identities/phone', input);
  }

  async listSecurityEvents(): Promise<SecurityEvent[]> {
    return this.get<SecurityEvent[]>('/v1/auth/security-events');
  }

  private async authHeaders(): Promise<Record<string, string>> {
    try {
      const { data } = await getCloudBaseAuth().getSession();
      const token = data?.access_token;
      if (!token) return {};
      return { Authorization: `Bearer ${token}` };
    } catch {
      return {};
    }
  }

  private async get<T>(path: string): Promise<T> {
    const url = this.resolveUrl(path);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(await this.authHeaders()),
      },
    });
    return this.parseResponse<T>(response);
  }

  private async post<T>(path: string, body: unknown, idempotencyKey?: string): Promise<T> {
    const url = this.resolveUrl(path);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        ...(await this.authHeaders()),
      },
      body: JSON.stringify(body),
    });
    return this.parseResponse<T>(response);
  }

  private resolveUrl(path: string): string {
    if (!GATEWAY_URL) {
      throw new AuthSecurityError('GATEWAY_NOT_CONFIGURED', 'Auth gateway URL is not configured.');
    }
    const base = GATEWAY_URL.replace(/\/$/, '');
    return `${base}${path}`;
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const payload = (await response.json()) as { ok: boolean; code?: string; message?: string; data?: T };
    if (!response.ok || payload.ok === false) {
      throw new AuthSecurityError(payload.code ?? 'SERVICE_TEMPORARILY_UNAVAILABLE', payload.message);
    }
    return payload.data as T;
  }
}

export class AuthSecurityError extends Error {
  constructor(
    public readonly code: string,
    message?: string
  ) {
    super(message);
    this.name = 'AuthSecurityError';
  }
}
