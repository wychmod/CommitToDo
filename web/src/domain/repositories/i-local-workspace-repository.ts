/**
 * Local IndexedDB workspace ownership repository.
 */

import type { LocalWorkspaceOwner } from '../entities/local-workspace-owner';

export interface LocalWorkspaceSummary {
  repositoryCount: number;
  taskCount: number;
}

export interface ILocalWorkspaceRepository {
  getLegacyWorkspaceSummary(): Promise<LocalWorkspaceSummary | null>;
  getOwner(): Promise<LocalWorkspaceOwner | null>;
  hasWorkspace(principalId: string): Promise<boolean>;
  claimLegacyWorkspace(owner: LocalWorkspaceOwner): Promise<void>;
  createWorkspace(owner: LocalWorkspaceOwner): Promise<void>;
  activateWorkspace(principalId: string): boolean;
  resolveNamespace(principalId: string): string;
}
