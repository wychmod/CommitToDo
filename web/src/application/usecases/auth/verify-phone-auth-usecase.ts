import { inject, injectable } from 'tsyringe';

import type { AuthSessionSummary } from '@/domain/entities/auth-session';
import type { IAuthRepository } from '@/domain/repositories/i-auth-repository';
import type { IAuthSecurityRepository } from '@/domain/repositories/i-auth-security-repository';

export interface VerifyPhoneAuthInput {
  verificationId: string;
  code: string;
}

@injectable()
export class VerifyPhoneAuthUseCase {
  constructor(
    @inject('IAuthRepository') private readonly authRepository: IAuthRepository,
    @inject('IAuthSecurityRepository') private readonly securityRepository: IAuthSecurityRepository
  ) {}

  async execute(input: VerifyPhoneAuthInput): Promise<AuthSessionSummary> {
    await this.securityRepository.verifyChallenge({
      challengeId: input.verificationId,
      code: input.code,
    });
    const session = await this.authRepository.verifyOtp(
      input.verificationId,
      input.code
    );
    await this.securityRepository.bootstrapProfile().catch(() => undefined);
    return session;
  }
}
