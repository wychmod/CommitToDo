import { inject, injectable } from 'tsyringe';

import type { UserProfile } from '@/domain/entities/user-profile';
import type { IAuthSecurityRepository } from '@/domain/repositories/i-auth-security-repository';

@injectable()
export class BootstrapUserProfileUseCase {
  constructor(
    @inject('IAuthSecurityRepository') private readonly securityRepository: IAuthSecurityRepository
  ) {}

  async execute(): Promise<UserProfile> {
    return this.securityRepository.bootstrapProfile();
  }
}
