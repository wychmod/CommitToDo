import { inject, injectable } from 'tsyringe';

import type { IAuthRepository } from '@/domain/repositories/i-auth-repository';

@injectable()
export class SignOutUseCase {
  constructor(
    @inject('IAuthRepository') private readonly authRepository: IAuthRepository
  ) {}

  async execute(): Promise<void> {
    return this.authRepository.signOut();
  }
}
