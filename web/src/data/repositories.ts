import { db } from './db';
import { assertInTransaction } from './transaction';
import type { Badge, Branch, Commit, EventRecord, Milestone, Settings, Task } from './types';

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
}

export interface TaskRepository {
  listOpenByOwner(ownerId: string): Promise<Task[]>;
  listByBranch(branchId: string): Promise<Task[]>;
}

export interface CommitRepository {
  listRecent(ownerId: string, limit: number): Promise<Commit[]>;
}

export interface MilestoneRepository {
  listByOwner(ownerId: string): Promise<Milestone[]>;
}

export interface BadgeRepository {
  listByOwner(ownerId: string): Promise<Badge[]>;
}

export interface SettingsRepository {
  getByOwner(ownerId: string): Promise<Settings | undefined>;
  getById(id: string): Promise<Settings | undefined>;
  put(row: Settings): Promise<string>;
}

export interface EventRepository {
  listRecent(ownerId: string, limit: number): Promise<EventRecord[]>;
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
};

export const taskRepository: TaskRepository = {
  listOpenByOwner: (ownerId) =>
    db.tasks.where('[ownerId+status]').equals([ownerId, 'open']).toArray(),
  listByBranch: (branchId) => db.tasks.where('branchId').equals(branchId).toArray(),
};

export const commitRepository: CommitRepository = {
  listRecent: async (ownerId, limit) => {
    const rows = await db.commits.where('ownerId').equals(ownerId).toArray();
    return rows.sort((a, b) => b.at - a.at).slice(0, limit);
  },
};

export const milestoneRepository: MilestoneRepository = {
  listByOwner: (ownerId) => db.milestones.where('ownerId').equals(ownerId).toArray(),
};

export const badgeRepository: BadgeRepository = {
  listByOwner: (ownerId) => db.badges.where('ownerId').equals(ownerId).toArray(),
};

export const settingsRepository: SettingsRepository = {
  getByOwner: async (ownerId) => db.settings.where('ownerId').equals(ownerId).first(),
  getById: (id) => db.settings.get(id),
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
};

// TODO(写路径): 待办/提交/里程碑的 create / update / finish / drop
// 在实现页面前补上；写入必须同事务维护 branches 的四个计数（§5.3.3 R7）。
