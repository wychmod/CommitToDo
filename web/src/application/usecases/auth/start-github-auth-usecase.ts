import { inject, injectable } from 'tsyringe';

import type { IAuthRepository } from '@/domain/repositories/i-auth-repository';

export interface StartGithubAuthInput {
  intent: 'login' | 'signup';
  returnTo: string;
}

@injectable()
export class StartGithubAuthUseCase {
  constructor(
    @inject('IAuthRepository') private readonly authRepository: IAuthRepository
  ) {}

  async execute(input: StartGithubAuthInput): Promise<{ url: string }> {
    return this.authRepository.startGithubAuth({
      provider: 'github',
      intent: input.intent,
      returnTo: input.returnTo,
    });
  }
}
