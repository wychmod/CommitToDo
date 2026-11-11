import { inject, injectable } from 'tsyringe';

import type { AuthChallenge } from '@/domain/entities/auth-challenge';
import type { IAuthSecurityRepository } from '@/domain/repositories/i-auth-security-repository';

export interface RequestAuthChallengeInput {
  purpose: 'signup' | 'signin' | 'bind' | 'recovery';
  channel: 'sms' | 'email';
  target: string;
  captchaToken?: string;
}

@injectable()
export class RequestAuthChallengeUseCase {
  constructor(
    @inject('IAuthSecurityRepository') private readonly securityRepository: IAuthSecurityRepository
  ) {}

  async execute(input: RequestAuthChallengeInput): Promise<AuthChallenge> {
    return this.securityRepository.requestChallenge(input);
  }
}
