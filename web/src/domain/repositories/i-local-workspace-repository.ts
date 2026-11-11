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
  /**
   * 解除账号级工作区绑定，回到本地库。
   * 返回 true 表示绑定确实变了，调用方需要重新加载页面才能切换到本地库。
   */
  deactivateWorkspace(): boolean;
  resolveNamespace(principalId: string): string;
}
