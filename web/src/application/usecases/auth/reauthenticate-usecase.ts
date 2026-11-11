import { inject, injectable } from 'tsyringe';

import type { AuthSessionSummary } from '@/domain/entities/auth-session';
import type { IAuthRepository } from '@/domain/repositories/i-auth-repository';

export interface ReauthenticateInput {
  password: string;
}

@injectable()
export class ReauthenticateUseCase {
  constructor(
    @inject('IAuthRepository') private readonly authRepository: IAuthRepository
  ) {}

  async execute(input: ReauthenticateInput): Promise<AuthSessionSummary> {
    return this.authRepository.reauthenticate(input.password);
  }
}
