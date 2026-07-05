import { describe, expect, it, beforeEach } from 'vitest';
import { AppDatabase } from '../../data/db/app-database';
import { container } from '../../core/di/injection-container';
import { useHomeStore } from './home-store';

async function resetDatabase(): Promise<void> {
  const db = container.resolve(AppDatabase);
  await db.repositories.clear();
  await db.branches.clear();
  await db.tasks.clear();
  await db.commits.clear();
}

describe('HomeStore', () => {
  beforeEach(async () => {
    await resetDatabase();
    useHomeStore.setState({ repositories: [], isLoading: false, error: null });
  });

  it('loads empty repositories', async () => {
    const store = useHomeStore.getState();
    await store.load();
    expect(useHomeStore.getState().repositories).toHaveLength(0);
  });

  it('creates a repository and reloads list', async () => {
    const store = useHomeStore.getState();
    const created = await store.createRepository('Test Repo');
    expect(created).not.toBeNull();
    expect(useHomeStore.getState().repositories).toHaveLength(1);
    expect(useHomeStore.getState().repositories[0].name).toBe('Test Repo');
  });

  it('deletes a repository', async () => {
    const store = useHomeStore.getState();
    const created = await store.createRepository('To Delete');
    expect(created).not.toBeNull();
    await store.deleteRepository(created!.id);
    expect(useHomeStore.getState().repositories).toHaveLength(0);
  });
});
