/**
 * 领域类型（TECH-ARCHITECTURE.md §5.3）。
 *
 * 只描述落库形状，不放业务规则；规则见 §5.3.3 与 src/core/rules。
 * MVP 只有本机一个 owner，`ownerId` 固定为 `local`，V2 接账号后再填真实用户。
 */

import type { AnnotationMode } from '@/core/rules/annotation-visibility';
import type { Theme } from '@/core/rules/theme-preference';
import type { TreeDensity } from '@/core/rules/tree-density';

export type OwnerId = string;
export type BranchStatus = 'active' | 'merged' | 'dropped';
export type TaskStatus = 'open' | 'done' | 'cancelled';
export type DatePrecision = 'day' | 'month' | 'year';
export type BackupKind = 'auto' | 'manual' | 'pre-restore' | 'remote';

export type { AnnotationMode, Theme, TreeDensity };

export interface Branch {
  id: string;
  ownerId: OwnerId;
  parentId: string | null;
  path: string;
  depth: number;
  title: string;
  /** 选填的一句目标，P03 页头直接展示。 */
  goal: string | null;
  color: string;
  status: BranchStatus;
  order: number;
  archivedAt: number | null;
  finishedAt: number | null;
  finishedIntoId: string | null;
  droppedAt: number | null;
  dropReason: string | null;
  pinnedAt: number | null;
  taskTotal: number;
  taskDone: number;
  commitCount: number;
  ownLastCommitAt: number | null;
  rev: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface Task {
  id: string;
  ownerId: OwnerId;
  branchId: string;
  title: string;
  /** 待办的补充说明，可为空；提交文案的「补一句」另存于 `commits.summary`。 */
  note: string | null;
  status: TaskStatus;
  /** 外部截止日期，`YYYY-MM-DD`。 */
  dueDate: string | null;
  /** 用户显式安排做这件事的日期，`YYYY-MM-DD`（R8）。 */
  plannedDate: string | null;
  completedAt: number | null;
  completedCommitId: string | null;
  cancelledAt: number | null;
  order: number;
  rev: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface Commit {
  id: string;
  ownerId: OwnerId;
  branchId: string;
  sourceBranchId: string;
  taskId: string | null;
  /** 业务日期，`YYYY-MM-DD`。 */
  date: string;
  at: number;
  summary: string;
  voidedAt: number | null;
  rev: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface Milestone {
  id: string;
  ownerId: OwnerId;
  branchId: string;
  title: string;
  note: string | null;
  achievedAt: number;
  datePrecision: DatePrecision;
  rev: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface Badge {
  id: string;
  ownerId: OwnerId;
  catalogId: string;
  category: 'structure' | 'time' | 'milestone';
  periodKey: string;
  grantedAt: number;
  /** 授予时的快照：来源实体与计数。 */
  snapshot: Record<string, unknown>;
  sourceEntityId: string | null;
  rev: number;
  createdAt: number;
}

export interface Settings {
  id: string;
  ownerId: OwnerId;
  theme: Theme;
  treeDensity: TreeDensity;
  annotations: AnnotationMode;
  reminderEnabled: boolean;
  lastAutoBackupAt: number | null;
  rev: number;
  updatedAt: number;
}

/** 年度总结（PRD V1-02 §5）：每用户每年一行，只存用户手写的一句。 */
export interface YearReview {
  id: string;
  ownerId: OwnerId;
  year: number;
  note: string;
  rev: number;
  createdAt: number;
  updatedAt: number;
}

/** 本机备份与快照（PRD V1-06 §5，TECH §5.3）。`payload` 为明文 JSON 快照正文。 */
export interface Backup {
  id: string;
  ownerId: OwnerId;
  kind: BackupKind;
  createdAt: number;
  branchCount: number;
  taskCount: number;
  commitCount: number;
  schemaVersion: number;
  bytes: number;
  restoredAt: number | null;
  /** 异地备份的远端对象键；本机快照为 null。 */
  remoteKey: string | null;
  payload: string;
}

export interface EventRecord {
  id: string;
  ownerId: OwnerId;
  entityType:
    'branch' | 'task' | 'commit' | 'milestone' | 'badge' | 'settings' | 'sync' | 'data' | 'backup';
  entityId: string;
  action: string;
  payload: Record<string, unknown>;
  at: number;
  /** 写入时的本地时区偏移（东正西负，分钟），审计用；业务表不带。 */
  tzOffset: number;
  deviceId: string | null;
}

/** 待推送队列（PRD V2-02 §5）：本地先写时与业务写入同事务落库。 */
export interface OutboxOp {
  /** 推送幂等键，ULID。 */
  opId: string;
  entity: 'branch' | 'task' | 'commit' | 'milestone' | 'badge' | 'sync';
  entityId: string;
  action: string;
  /** 推送时的实体快照；行已被删除时为动作 payload。 */
  payload: Record<string, unknown>;
  baseRev: number | null;
  attempts: number;
  lastError: string | null;
  createdAt: number;
}

/** 冲突记录（PRD V2-02 §5）：服务端拒绝过期写入时落库，只读展示。 */
export interface SyncConflict {
  id: string;
  ownerId: OwnerId;
  entity: string;
  entityId: string;
  branchId: string | null;
  field: string | null;
  localPayload: Record<string, unknown> | null;
  serverPayload: Record<string, unknown> | null;
  deviceId: string | null;
  localRev: number | null;
  serverRev: number | null;
  at: number;
  /** 本期不写入，只保留字段给后续的解决动作。 */
  resolved?: boolean;
  resolvedAt?: number | null;
}

/** 已连接设备（PRD V2-02 §5）。`removedAt` 保留但本期不在界面消费。 */
export interface Device {
  id: string;
  ownerId: OwnerId;
  label: string;
  platform: string;
  lastSyncAt: number | null;
  createdAt: number;
  removedAt: number | null;
}

/** 首次迁移断点（PRD V2-02 §5），`id` 为集合名。 */
export interface MigrationState {
  id: string;
  lastId: string | null;
  pushed: number;
  done: boolean;
  updatedAt: number;
}

/** 匿名计数（PRD V2-02 §5），只由云函数写；本机不写这一行。 */
export interface Counter {
  id: string;
  value: number;
}
