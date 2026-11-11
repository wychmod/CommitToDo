import { inject, injectable } from 'tsyringe';

import type { AuthSessionSummary } from '@/domain/entities/auth-session';
import type { IAuthRepository } from '@/domain/repositories/i-auth-repository';
import type { IAuthSecurityRepository } from '@/domain/repositories/i-auth-security-repository';

export interface CompleteOAuthCallbackInput {
  provider: 'github';
  code: string;
  state: string;
}

@injectable()
export class CompleteOAuthCallbackUseCase {
  constructor(
    @inject('IAuthRepository') private readonly authRepository: IAuthRepository,
    @inject('IAuthSecurityRepository') private readonly securityRepository: IAuthSecurityRepository
  ) {}

  async execute(input: CompleteOAuthCallbackInput): Promise<AuthSessionSummary> {
    const session = await this.authRepository.completeOAuthCallback(input);
    await this.securityRepository.bootstrapProfile().catch(() => undefined);
    return session;
  }
}
