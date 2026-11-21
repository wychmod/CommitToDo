import { describe, expect, it } from 'vitest';
import {
  MIGRATION_COLLECTIONS,
  completedCollections,
  nextCursor,
  nextMigrationStep,
  pageAfter,
  type MigrationCursor,
} from './migration-plan';

const cursor = (over: Partial<MigrationCursor> = {}): MigrationCursor => ({
  collection: 'branches',
  lastId: null,
  pushed: 0,
  done: false,
  updatedAt: 1_000,
  ...over,
});

describe('迁移集合顺序与断点续传（V2-02 §8.2）', () => {
  it('全部未迁移时从第一个集合开始', () => {
    expect(nextMigrationStep([])).toEqual({
      done: false,
      collection: MIGRATION_COLLECTIONS[0],
      index: 0,
      total: MIGRATION_COLLECTIONS.length,
      lastId: null,
    });
    expect(completedCollections([])).toBe(0);
  });

  it('已完成的集合被跳过，从断点 lastId 继续', () => {
    const step = nextMigrationStep([
      cursor({ collection: 'branches', done: true }),
      cursor({ collection: 'tasks', lastId: 'task-42', pushed: 42 }),
    ]);
    expect(step).toEqual({
      done: false,
      collection: 'tasks',
      index: 1,
      total: MIGRATION_COLLECTIONS.length,
      lastId: 'task-42',
    });
    expect(completedCollections([cursor({ collection: 'branches', done: true })])).toBe(1);
  });

  it('最后一个集合完成时返回结束态', () => {
    const all = MIGRATION_COLLECTIONS.map((collection) => cursor({ collection, done: true }));
    expect(nextMigrationStep(all)).toEqual({
      done: true,
      completed: MIGRATION_COLLECTIONS.length,
      total: MIGRATION_COLLECTIONS.length,
    });
    expect(completedCollections(all)).toBe(MIGRATION_COLLECTIONS.length);
  });

  it('分页从 lastId 之后继续，断点恰好是最后一条时返回空页', () => {
    const rows = [{ id: '01' }, { id: '02' }, { id: '03' }];
    expect(pageAfter(rows, null, 2).map((row) => row.id)).toEqual(['01', '02']);
    expect(pageAfter(rows, '02', 2).map((row) => row.id)).toEqual(['03']);
    expect(pageAfter(rows, '03', 2)).toEqual([]);
    expect(pageAfter(rows, null, 0)).toEqual([]);
  });

  it('一页成功后的断点推进，推完标记完成', () => {
    expect(nextCursor(null, [{ id: '01' }, { id: '02' }], false)).toEqual({
      lastId: '02',
      done: false,
    });
    expect(nextCursor('03', [], true)).toEqual({ lastId: '03', done: true });
  });
});
