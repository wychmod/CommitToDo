import { db } from './db';
import { assertInTransaction } from './transaction';
import type {
  Badge,
  Backup,
  Branch,
  Commit,
  EventRecord,
  Milestone,
  Settings,
  Task,
  YearReview,
} from './types';

/**
 * 仓储层（TECH-ARCHITECTURE.md §5.6 / §5.7）。
 *
 * 只暴露读接口；写路径等页面实现时再补，且必须同事务维护四计数（R7）。
 * 页面不允许直接 import `@/data/db`，一律经这里与 `@/data/hooks`。
 */

export interface BranchRepository {
  listByOwner(ownerId: string): Promise<Branch[]>;
  getById(branchId: string): Promise<Branch | undefined>;
  create(row: Branch): Promise<string>;
  put(row: Branch): Promise<string>;
  /** 物理删除整棵空子树（R13），只允许在用例事务内调用。 */
  remove(ids: readonly string[]): Promise<void>;
}

export interface TaskRepository {
  listByOwner(ownerId: string): Promise<Task[]>;
  listOpenByOwner(ownerId: string): Promise<Task[]>;
  listByBranch(branchId: string): Promise<Task[]>;
  getById(taskId: string): Promise<Task | undefined>;
  create(row: Task): Promise<string>;
  update(
    taskId: string,
    patch: Partial<Omit<Task, 'id' | 'ownerId'>>,
    rev: number,
  ): Promise<number>;
}

export interface CommitRepository {
  listByOwner(ownerId: string): Promise<Commit[]>;
  listRecent(ownerId: string, limit: number): Promise<Commit[]>;
  listByBranch(branchId: string): Promise<Commit[]>;
  listBySourceBranch(sourceBranchId: string): Promise<Commit[]>;
  getById(commitId: string): Promise<Commit | undefined>;
  create(row: Commit): Promise<string>;
  update(
    commitId: string,
    patch: Partial<Omit<Commit, 'id' | 'ownerId'>>,
    rev: number,
  ): Promise<number>;
}

export interface MilestoneRepository {
  getById(id: string): Promise<Milestone | undefined>;
  listByOwner(ownerId: string): Promise<Milestone[]>;
  listByBranch(branchId: string): Promise<Milestone[]>;
  create(row: Milestone): Promise<string>;
}

export interface BadgeRepository {
  listByOwner(ownerId: string): Promise<Badge[]>;
  create(row: Badge): Promise<string>;
}

export interface SettingsRepository {
  getByOwner(ownerId: string): Promise<Settings | undefined>;
  getById(id: string): Promise<Settings | undefined>;
  listByOwner(ownerId: string): Promise<Settings[]>;
  put(row: Settings): Promise<string>;
}

export interface EventRepository {
  listRecent(ownerId: string, limit: number): Promise<EventRecord[]>;
  listByEntity(entityId: string): Promise<EventRecord[]>;
}

export interface YearReviewRepository {
  getByOwnerYear(ownerId: string, year: number): Promise<YearReview | undefined>;
  listByOwner(ownerId: string): Promise<YearReview[]>;
  create(row: YearReview): Promise<string>;
  update(
    id: string,
    patch: Partial<Omit<YearReview, 'id' | 'ownerId'>>,
    rev: number,
  ): Promise<number>;
  remove(id: string): Promise<void>;
}

export const branchRepository: BranchRepository = {
  listByOwner: (ownerId) => db.branches.where('ownerId').equals(ownerId).sortBy('order'),
  getById: (branchId) => db.branches.get(branchId),
  create: (row) => {
    assertInTransaction();
    return db.branches.add(row);
  },
  put: (row) => {
    assertInTransaction();
    return db.branches.put(row);
  },
  remove: async (ids) => {
    assertInTransaction();
    await db.branches.bulkDelete([...ids]);
  },
};

export const taskRepository: TaskRepository = {
  listByOwner: (ownerId) => db.tasks.where('ownerId').equals(ownerId).toArray(),
  listOpenByOwner: (ownerId) =>
    db.tasks.where('[ownerId+status]').equals([ownerId, 'open']).toArray(),
  listByBranch: (branchId) => db.tasks.where('branchId').equals(branchId).toArray(),
  getById: (taskId) => db.tasks.get(taskId),
  create: (row) => {
    assertInTransaction();
    return db.tasks.add(row);
  },
  update: (taskId, patch, rev) => {
    assertInTransaction();
    return db.tasks.update(taskId, { ...patch, rev: rev + 1 });
  },
};

export const commitRepository: CommitRepository = {
  listByOwner: (ownerId) => db.commits.where('ownerId').equals(ownerId).toArray(),
  listRecent: async (ownerId, limit) => {
    const rows = await db.commits.where('ownerId').equals(ownerId).toArray();
    return rows
      .filter((row) => row.deletedAt === null && row.voidedAt === null)
      .sort((a, b) => b.at - a.at)
      .slice(0, limit);
  },
  listByBranch: (branchId) => db.commits.where('branchId').equals(branchId).toArray(),
  listBySourceBranch: (sourceBranchId) =>
    db.commits.where('sourceBranchId').equals(sourceBranchId).toArray(),
  getById: (commitId) => db.commits.get(commitId),
  create: (row) => {
    assertInTransaction();
    return db.commits.add(row);
  },
  update: (commitId, patch, rev) => {
    assertInTransaction();
    return db.commits.update(commitId, { ...patch, rev: rev + 1 });
  },
};

export const milestoneRepository: MilestoneRepository = {
  getById: (id) => db.milestones.get(id),
  listByOwner: (ownerId) => db.milestones.where('ownerId').equals(ownerId).toArray(),
  listByBranch: (branchId) => db.milestones.where('branchId').equals(branchId).toArray(),
  create: (row) => {
    assertInTransaction();
    return db.milestones.add(row);
  },
};

export const badgeRepository: BadgeRepository = {
  listByOwner: (ownerId) => db.badges.where('ownerId').equals(ownerId).toArray(),
  create: (row) => {
    assertInTransaction();
    return db.badges.add(row);
  },
};

export const settingsRepository: SettingsRepository = {
  getByOwner: async (ownerId) => db.settings.where('ownerId').equals(ownerId).first(),
  getById: (id) => db.settings.get(id),
  listByOwner: (ownerId) => db.settings.where('ownerId').equals(ownerId).toArray(),
  put: (row) => {
    assertInTransaction();
    return db.settings.put(row);
  },
};

export const eventRepository: EventRepository = {
  listRecent: async (ownerId, limit) => {
    const rows = await db.events.where('ownerId').equals(ownerId).toArray();
    return rows.sort((a, b) => b.at - a.at).slice(0, limit);
  },
  listByEntity: async (entityId) => {
    const rows = await db.events.where('entityId').equals(entityId).toArray();
    return rows.sort((a, b) => a.at - b.at);
  },
};

export interface BackupRepository {
  listByOwner(ownerId: string): Promise<Backup[]>;
  getById(backupId: string): Promise<Backup | undefined>;
  create(row: Backup): Promise<string>;
  update(backupId: string, patch: Partial<Omit<Backup, 'id' | 'ownerId'>>): Promise<number>;
  remove(ids: readonly string[]): Promise<void>;
}

export const backupRepository: BackupRepository = {
  listByOwner: (ownerId) => db.backups.where('ownerId').equals(ownerId).toArray(),
  getById: (backupId) => db.backups.get(backupId),
  create: (row) => {
    assertInTransaction();
    return db.backups.add(row);
  },
  update: (backupId, patch) => {
    assertInTransaction();
    return db.backups.update(backupId, patch);
  },
  remove: async (ids) => {
    assertInTransaction();
    await db.backups.bulkDelete([...ids]);
  },
};

export const yearReviewRepository: YearReviewRepository = {
  getByOwnerYear: (ownerId, year) =>
    db.yearReviews.where('[ownerId+year]').equals([ownerId, year]).first(),
  listByOwner: (ownerId) => db.yearReviews.where('ownerId').equals(ownerId).toArray(),
  create: (row) => {
    assertInTransaction();
    return db.yearReviews.add(row);
  },
  update: (id, patch, rev) => {
    assertInTransaction();
    return db.yearReviews.update(id, { ...patch, rev: rev + 1 });
  },
  remove: (id) => {
    assertInTransaction();
    return db.yearReviews.delete(id);
  },
};
