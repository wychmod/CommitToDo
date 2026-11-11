import { inject, injectable } from 'tsyringe';

import type { UserProfile } from '@/domain/entities/user-profile';
import type { IAuthSecurityRepository } from '@/domain/repositories/i-auth-security-repository';

export interface BindPhoneInput {
  phone: string;
  verificationId: string;
  code: string;
}

@injectable()
export class BindPhoneUseCase {
  constructor(
    @inject('IAuthSecurityRepository') private readonly securityRepository: IAuthSecurityRepository
  ) {}

  async execute(input: BindPhoneInput): Promise<UserProfile> {
    return this.securityRepository.bindPhone(input);
  }
}
