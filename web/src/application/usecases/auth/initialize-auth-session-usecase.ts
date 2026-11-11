import { inject, injectable } from 'tsyringe';

import type { AuthSessionSummary } from '@/domain/entities/auth-session';
import type { IAuthRepository } from '@/domain/repositories/i-auth-repository';

@injectable()
export class InitializeAuthSessionUseCase {
  constructor(
    @inject('IAuthRepository') private readonly authRepository: IAuthRepository
  ) {}

  async execute(): Promise<AuthSessionSummary | null> {
    return this.authRepository.getSession();
  }
}
