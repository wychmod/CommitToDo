/**
 * Dexie-backed local workspace ownership repository.
 */

import { injectable } from 'tsyringe';

import type { LocalWorkspaceOwner } from '@/domain/entities/local-workspace-owner';
import {
  type ILocalWorkspaceRepository,
  type LocalWorkspaceSummary,
} from '@/domain/repositories/i-local-workspace-repository';
import {
  activeDatabaseStorageKey,
  AppDatabase,
  legacyDatabaseName,
} from '@/data/db/app-database';

const LEGACY_OWNER_KEY = 'local-workspace-owner';
const REGISTRY_KEY = 'commit.local-workspaces.v1';

interface WorkspaceRegistryEntry extends LocalWorkspaceOwner {
  namespace: string;
  source: 'legacy' | 'empty';
}

interface WorkspaceRegistry {
  legacyOwner: LocalWorkspaceOwner | null;
  workspaces: Record<string, WorkspaceRegistryEntry>;
}

@injectable()
export class DexieLocalWorkspaceRepository implements ILocalWorkspaceRepository {
  async getLegacyWorkspaceSummary(): Promise<LocalWorkspaceSummary | null> {
    const legacy = new AppDatabase(legacyDatabaseName);
    try {
      await legacy.open();
      const [repositoryCount, taskCount] = await Promise.all([
        legacy.repositories.count(),
        legacy.tasks.count(),
      ]);

      if (repositoryCount === 0 && taskCount === 0) return null;

      return { repositoryCount, taskCount };
    } catch {
      return null;
    } finally {
      legacy.close();
    }
  }

  async getOwner(): Promise<LocalWorkspaceOwner | null> {
    return this.readRegistry().legacyOwner;
  }

  async hasWorkspace(principalId: string): Promise<boolean> {
    return Boolean(this.readRegistry().workspaces[principalId]);
  }

  async claimLegacyWorkspace(owner: LocalWorkspaceOwner): Promise<void> {
    const namespace = this.resolveNamespace(owner.principalId);
    await this.copyLegacyDatabase(namespace);

    const registry = this.readRegistry();
    registry.legacyOwner = owner;
    registry.workspaces[owner.principalId] = {
      ...owner,
      namespace,
      source: 'legacy',
    };
    this.writeRegistry(registry);
  }

  async createWorkspace(owner: LocalWorkspaceOwner): Promise<void> {
    const namespace = this.resolveNamespace(owner.principalId);
    const target = new AppDatabase(namespace);
    try {
      await target.open();
    } finally {
      target.close();
    }

    const registry = this.readRegistry();
    registry.workspaces[owner.principalId] = {
      ...owner,
      namespace,
      source: 'empty',
    };
    this.writeRegistry(registry);
  }

  activateWorkspace(principalId: string): boolean {
    const entry = this.readRegistry().workspaces[principalId];
    if (!entry) return false;
    const changed = localStorage.getItem(activeDatabaseStorageKey) !== entry.namespace;
    localStorage.setItem(activeDatabaseStorageKey, entry.namespace);
    return changed;
  }

  resolveNamespace(principalId: string): string {
    return `${legacyDatabaseName}-${principalId}`;
  }

  private readRegistry(): WorkspaceRegistry {
    try {
      const raw = localStorage.getItem(REGISTRY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as WorkspaceRegistry;
        if (parsed && typeof parsed.workspaces === 'object') {
          return {
            legacyOwner: parsed.legacyOwner ?? null,
            workspaces: parsed.workspaces,
          };
        }
      }
    } catch {
      // Fall through to the legacy metadata migration.
    }

    const legacyOwner = this.readLegacyOwner();
    return { legacyOwner, workspaces: {} };
  }

  private writeRegistry(registry: WorkspaceRegistry): void {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
  }

  private readLegacyOwner(): LocalWorkspaceOwner | null {
    try {
      const raw = localStorage.getItem(LEGACY_OWNER_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as LocalWorkspaceOwner;
      if (!parsed.principalId || !parsed.claimedAt) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private async copyLegacyDatabase(namespace: string): Promise<void> {
    const source = new AppDatabase(legacyDatabaseName);
    const target = new AppDatabase(namespace);

    try {
      await Promise.all([source.open(), target.open()]);
      const [repositories, branches, tasks, commits, tags, taskTags] = await Promise.all([
        source.repositories.toArray(),
        source.branches.toArray(),
        source.tasks.toArray(),
        source.commits.toArray(),
        source.tags.toArray(),
        source.taskTags.toArray(),
      ]);

      await Promise.all([
        target.repositories.clear(),
        target.branches.clear(),
        target.tasks.clear(),
        target.commits.clear(),
        target.tags.clear(),
        target.taskTags.clear(),
      ]);
      await target.repositories.bulkPut(repositories);
      await target.branches.bulkPut(branches);
      await target.tasks.bulkPut(tasks);
      await target.commits.bulkPut(commits);
      await target.tags.bulkPut(tags);
      await target.taskTags.bulkPut(taskTags);

      const [sourceRepositories, sourceTasks, targetRepositories, targetTasks] = await Promise.all([
        source.repositories.count(),
        source.tasks.count(),
        target.repositories.count(),
        target.tasks.count(),
      ]);
      if (sourceRepositories !== targetRepositories || sourceTasks !== targetTasks) {
        throw new Error('Local workspace copy verification failed.');
      }
    } finally {
      source.close();
      target.close();
    }
  }
}
