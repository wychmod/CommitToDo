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
  setOwner(owner: LocalWorkspaceOwner): Promise<void>;
  resolveNamespace(principalId: string): string;
}
