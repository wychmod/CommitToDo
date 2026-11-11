/**
 * Dexie-backed local workspace ownership repository.
 */

import { injectable } from 'tsyringe';

import type { LocalWorkspaceOwner } from '@/domain/entities/local-workspace-owner';
import {
  type ILocalWorkspaceRepository,
  type LocalWorkspaceSummary,
} from '@/domain/repositories/i-local-workspace-repository';
import { appDatabase } from '@/data/db/app-database';

const OWNER_KEY = 'local-workspace-owner';
const LEGACY_DB_NAME = 'commit-db';

@injectable()
export class DexieLocalWorkspaceRepository implements ILocalWorkspaceRepository {
  async getLegacyWorkspaceSummary(): Promise<LocalWorkspaceSummary | null> {
    // The legacy database uses the default Dexie instance in app-database.
    // We only return counts; we do NOT expose repository/task contents.
    try {
      const [repositoryCount, taskCount] = await Promise.all([
        appDatabase.repositories.count(),
        appDatabase.tasks.count(),
      ]);

      if (repositoryCount === 0 && taskCount === 0) return null;

      return { repositoryCount, taskCount };
    } catch {
      return null;
    }
  }

  async getOwner(): Promise<LocalWorkspaceOwner | null> {
    try {
      const raw = localStorage.getItem(OWNER_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as LocalWorkspaceOwner;
      if (!parsed.principalId || !parsed.claimedAt) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  async setOwner(owner: LocalWorkspaceOwner): Promise<void> {
    localStorage.setItem(OWNER_KEY, JSON.stringify(owner));
  }

  resolveNamespace(principalId: string): string {
    return `${LEGACY_DB_NAME}-${principalId}`;
  }
}
