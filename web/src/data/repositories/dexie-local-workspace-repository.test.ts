import Dexie from 'dexie';
import { AppDatabase, activeDatabaseStorageKey, legacyDatabaseName } from '@/data/db/app-database';
import { DexieLocalWorkspaceRepository } from './dexie-local-workspace-repository';

const principalId = 'principal-test-1';
const namespace = `${legacyDatabaseName}-${principalId}`;

beforeEach(async () => {
  localStorage.clear();
  await Dexie.delete(legacyDatabaseName);
  await Dexie.delete(namespace);
});

afterEach(async () => {
  localStorage.clear();
  await Dexie.delete(legacyDatabaseName);
  await Dexie.delete(namespace);
});

it('copies legacy records into a principal namespace and verifies the copy', async () => {
  const legacy = new AppDatabase(legacyDatabaseName);
  await legacy.repositories.put({
    id: 'repo-1',
    name: 'Local',
    description: null,
    defaultBranchId: null,
    icon: 'folder',
    color: '#000',
    isArchived: 0,
    isDeleted: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  legacy.close();

  const repository = new DexieLocalWorkspaceRepository();
  await expect(repository.getLegacyWorkspaceSummary()).resolves.toEqual({
    repositoryCount: 1,
    taskCount: 0,
  });

  await repository.claimLegacyWorkspace({
    principalId,
    claimedAt: new Date().toISOString(),
  });

  const isolated = new AppDatabase(namespace);
  await expect(isolated.repositories.count()).resolves.toBe(1);
  isolated.close();
  expect(repository.activateWorkspace(principalId)).toBe(true);
  expect(localStorage.getItem(activeDatabaseStorageKey)).toBe(namespace);
});

it('creates an empty namespace without changing legacy data', async () => {
  const legacy = new AppDatabase(legacyDatabaseName);
  await legacy.repositories.put({
    id: 'legacy-repo',
    name: 'Legacy',
    description: null,
    defaultBranchId: null,
    icon: 'folder',
    color: '#000',
    isArchived: 0,
    isDeleted: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  legacy.close();

  const repository = new DexieLocalWorkspaceRepository();
  await repository.createWorkspace({ principalId, claimedAt: new Date().toISOString() });

  const isolated = new AppDatabase(namespace);
  const original = new AppDatabase(legacyDatabaseName);
  await expect(isolated.repositories.count()).resolves.toBe(0);
  await expect(original.repositories.count()).resolves.toBe(1);
  isolated.close();
  original.close();
});
