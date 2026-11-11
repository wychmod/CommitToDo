import { inject, injectable } from 'tsyringe';

import type { LocalWorkspaceOwner } from '@/domain/entities/local-workspace-owner';
import type { ILocalWorkspaceRepository, LocalWorkspaceSummary } from '@/domain/repositories/i-local-workspace-repository';

export type LocalWorkspaceResolution =
  | { type: 'no-legacy-data' }
  | { type: 'claim-pending'; summary: LocalWorkspaceSummary }
  | { type: 'claimed-by-current'; owner: LocalWorkspaceOwner }
  | { type: 'claimed-by-other'; owner: LocalWorkspaceOwner };

@injectable()
export class ResolveLocalWorkspaceUseCase {
  constructor(
    @inject('ILocalWorkspaceRepository') private readonly repository: ILocalWorkspaceRepository
  ) {}

  async execute(principalId: string): Promise<LocalWorkspaceResolution> {
    const owner = await this.repository.getOwner();

    if (owner) {
      if (owner.principalId === principalId) {
        return { type: 'claimed-by-current', owner };
      }
      return { type: 'claimed-by-other', owner };
    }

    const summary = await this.repository.getLegacyWorkspaceSummary();
    if (summary) {
      return { type: 'claim-pending', summary };
    }

    return { type: 'no-legacy-data' };
  }
}
