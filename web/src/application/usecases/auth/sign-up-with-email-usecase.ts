import { inject, injectable } from 'tsyringe';

import type { AuthSessionSummary } from '@/domain/entities/auth-session';
import type { IAuthRepository } from '@/domain/repositories/i-auth-repository';

export interface SignUpWithEmailInput {
  email: string;
  password: string;
}

export interface SignUpWithEmailResult {
  session: AuthSessionSummary;
  verificationId: string;
}

@injectable()
export class SignUpWithEmailUseCase {
  constructor(
    @inject('IAuthRepository') private readonly authRepository: IAuthRepository
  ) {}

  async execute(input: SignUpWithEmailInput): Promise<SignUpWithEmailResult> {
    return this.authRepository.signUpWithEmail(input);
  }
}
