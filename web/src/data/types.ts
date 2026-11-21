/**
 * 领域类型（TECH-ARCHITECTURE.md §5.3）。
 *
 * 只描述落库形状，不放业务规则；规则见 §5.3.3 与 src/core/rules。
 * MVP 只有本机一个 owner，`ownerId` 固定为 `local`，V2 接账号后再填真实用户。
 */

export type OwnerId = string;
export type BranchStatus = 'active' | 'merged' | 'dropped';
export type TaskStatus = 'open' | 'done' | 'cancelled';
export type DatePrecision = 'day' | 'month' | 'year';
export type Theme = 'light' | 'dark';
export type TreeDensity = 'compact' | 'comfortable';
export type AnnotationMode = 'off' | 'once' | 'always';
export type BackupKind = 'auto' | 'manual' | 'pre-restore' | 'remote';

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

export interface EventRecord {
  id: string;
  ownerId: OwnerId;
  entityType: 'branch' | 'task' | 'commit' | 'milestone' | 'badge' | 'settings' | 'sync';
  entityId: string;
  action: string;
  payload: Record<string, unknown>;
  at: number;
  /** 写入时的本地时区偏移（东正西负，分钟），审计用；业务表不带。 */
  tzOffset: number;
  deviceId: string | null;
}
