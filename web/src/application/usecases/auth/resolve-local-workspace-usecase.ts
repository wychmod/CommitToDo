import { inject, injectable } from 'tsyringe';

import type { LocalWorkspaceOwner } from '@/domain/entities/local-workspace-owner';
import type { ILocalWorkspaceRepository, LocalWorkspaceSummary } from '@/domain/repositories/i-local-workspace-repository';

export type LocalWorkspaceResolution =
  | { type: 'claim-pending'; summary: LocalWorkspaceSummary }
  | { type: 'claimed-by-current'; owner: LocalWorkspaceOwner; requiresReload: boolean }
  | { type: 'claimed-by-other'; owner: LocalWorkspaceOwner };

@injectable()
export class ResolveLocalWorkspaceUseCase {
  constructor(
    @inject('ILocalWorkspaceRepository') private readonly repository: ILocalWorkspaceRepository
  ) {}

  async execute(principalId: string): Promise<LocalWorkspaceResolution> {
    if (await this.repository.hasWorkspace(principalId)) {
      const owner = { principalId, claimedAt: new Date().toISOString() };
      return {
        type: 'claimed-by-current',
        owner,
        requiresReload: this.repository.activateWorkspace(principalId),
      };
    }

    const owner = await this.repository.getOwner();
    const summary = await this.repository.getLegacyWorkspaceSummary();

    if (summary && (!owner || owner.principalId === principalId)) {
      return { type: 'claim-pending', summary };
    }

    if (summary && owner) return { type: 'claimed-by-other', owner };

    const newOwner = { principalId, claimedAt: new Date().toISOString() };
    await this.repository.createWorkspace(newOwner);
    return {
      type: 'claimed-by-current',
      owner: newOwner,
      requiresReload: this.repository.activateWorkspace(principalId),
    };
  }
}
