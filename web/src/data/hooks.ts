import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useState } from 'react';
import { systemClock, today } from '@/core/clock';
import { normalizeAnnotationMode } from '@/core/rules/annotation-visibility';
import { normalizeTheme } from '@/core/rules/theme-preference';
import { resolveTreeDensity } from '@/core/rules/tree-density';
import { db, LOCAL_OWNER_ID } from './db';
import { DEFAULT_SETTINGS, type SettingsFields } from './settings-defaults';
import {
  badgeRepository,
  branchRepository,
  commitRepository,
  eventRepository,
  milestoneRepository,
  settingsRepository,
  taskRepository,
} from './repositories';
import type { Branch, Commit, EventRecord, Milestone, Task } from './types';

/**
 * 读路径统一走 `useLiveQuery`（TECH-ARCHITECTURE.md §2.6 / §5.4）。
 *
 * 返回 `undefined` 表示首次查询尚未完成，页面据此渲染加载态；
 * 空库时返回空数组，不用假数据填充。
 */

export function useBranches(ownerId = LOCAL_OWNER_ID) {
  return useLiveQuery(() => branchRepository.listByOwner(ownerId), [ownerId]);
}

export interface BranchesView {
  status: 'loading' | 'ready' | 'error';
  branches: Branch[];
  retry: () => void;
}

/**
 * 分支树页的读状态（PRD M02 §4.4）。
 *
 * 读取失败不抛出整页白屏：返回 `error` 让分支页保留外框与重试入口；
 * 重试只是重新订阅同一条查询，已有数据不会被清空。
 */
export function useBranchesView(ownerId = LOCAL_OWNER_ID): BranchesView {
  const [attempt, setAttempt] = useState(0);
  const result = useLiveQuery(async () => {
    try {
      return { ok: true as const, rows: await branchRepository.listByOwner(ownerId) };
    } catch {
      return { ok: false as const, rows: [] as Branch[] };
    }
  }, [ownerId, attempt]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  if (result === undefined) return { status: 'loading', branches: [], retry };
  if (!result.ok) return { status: 'error', branches: [], retry };
  return { status: 'ready', branches: result.rows, retry };
}

export function useBranch(branchId: string | undefined) {
  return useLiveQuery(
    () => (branchId ? branchRepository.getById(branchId) : undefined),
    [branchId],
  );
}

export interface BranchHeaderView {
  status: 'loading' | 'ready' | 'error';
  branch: Branch | null;
  /** 未删除的全部分支，供面包屑、只读判定与子分支区使用。 */
  branches: Branch[];
  retry: () => void;
}

/**
 * P03 页头（M04 OP-01/OP-07）。
 *
 * 页头独立于下方区块读取：区块还在加载时，路径、名称与状态可以先显示，
 * 不让整页骨架顶开页头。
 */
export function useBranchHeader(
  branchId: string | undefined,
  ownerId = LOCAL_OWNER_ID,
): BranchHeaderView {
  const [attempt, setAttempt] = useState(0);
  const result = useLiveQuery(async () => {
    try {
      const [branch, branches] = await Promise.all([
        branchId ? branchRepository.getById(branchId) : Promise.resolve(undefined),
        branchRepository.listByOwner(ownerId),
      ]);
      return { ok: true as const, branch: branch ?? null, branches };
    } catch {
      return { ok: false as const, branch: null, branches: [] as Branch[] };
    }
  }, [branchId, ownerId, attempt]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  if (result === undefined) {
    return { status: 'loading', branch: null, branches: [], retry };
  }
  if (!result.ok) {
    return { status: 'error', branch: null, branches: [], retry };
  }
  return { status: 'ready', branch: result.branch, branches: result.branches, retry };
}

export interface BranchTasksView {
  status: 'loading' | 'ready' | 'error';
  tasks: Task[];
  retry: () => void;
}

/** P03 待办区：只读本分支自己的待办（含已完成与已取消，供进度重算）。 */
export function useBranchTasks(branchId: string | undefined): BranchTasksView {
  const [attempt, setAttempt] = useState(0);
  const result = useLiveQuery(async () => {
    try {
      return {
        ok: true as const,
        rows: branchId ? await taskRepository.listByBranch(branchId) : [],
      };
    } catch {
      return { ok: false as const, rows: [] as Task[] };
    }
  }, [branchId, attempt]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  if (result === undefined) return { status: 'loading', tasks: [], retry };
  if (!result.ok) return { status: 'error', tasks: [], retry };
  return { status: 'ready', tasks: result.rows, retry };
}

export interface BranchCommitsView {
  status: 'loading' | 'ready' | 'error';
  commits: Commit[];
  retry: () => void;
}

/** P03 提交流：本分支全部提交，分页与排序由 `core/rules/commit-feed` 处理。 */
export function useBranchCommits(branchId: string | undefined): BranchCommitsView {
  const [attempt, setAttempt] = useState(0);
  const [cache, setCache] = useState<Commit[]>([]);
  const result = useLiveQuery(async () => {
    try {
      return {
        ok: true as const,
        rows: branchId ? await commitRepository.listByBranch(branchId) : [],
      };
    } catch {
      return { ok: false as const, rows: [] as Commit[] };
    }
  }, [branchId, attempt]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    setCache([]);
  }, [branchId]);

  useEffect(() => {
    if (result?.ok) setCache(result.rows);
  }, [result]);

  if (result === undefined) return { status: 'loading', commits: [], retry };
  // 读取失败时保留上一批已加载的提交，页头与其余区块不受影响。
  if (!result.ok) return { status: 'error', commits: cache, retry };
  return { status: 'ready', commits: result.rows, retry };
}

export interface BranchMilestonesView {
  status: 'loading' | 'ready' | 'error';
  milestones: Milestone[];
  retry: () => void;
}

/** P03 里程碑行：本分支的里程碑，渲染精度由 `core/rules/milestone-date` 决定。 */
export function useBranchMilestones(branchId: string | undefined): BranchMilestonesView {
  const [attempt, setAttempt] = useState(0);
  const result = useLiveQuery(async () => {
    try {
      return {
        ok: true as const,
        rows: branchId ? await milestoneRepository.listByBranch(branchId) : [],
      };
    } catch {
      return { ok: false as const, rows: [] as Milestone[] };
    }
  }, [branchId, attempt]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  if (result === undefined) return { status: 'loading', milestones: [], retry };
  if (!result.ok) return { status: 'error', milestones: [], retry };
  return { status: 'ready', milestones: result.rows, retry };
}

export function useOpenTasks(ownerId = LOCAL_OWNER_ID) {
  return useLiveQuery(() => taskRepository.listOpenByOwner(ownerId), [ownerId]);
}

export function useRecentCommits(ownerId = LOCAL_OWNER_ID, limit = 3) {
  return useLiveQuery(() => commitRepository.listRecent(ownerId, limit), [ownerId, limit]);
}

export function useMilestones(ownerId = LOCAL_OWNER_ID) {
  return useLiveQuery(() => milestoneRepository.listByOwner(ownerId), [ownerId]);
}

export interface TodayDataView {
  status: 'loading' | 'ready' | 'error';
  tasks: Task[];
  branches: Branch[];
  commits: Commit[];
  todayDate: string;
  retry: () => void;
}

/**
 * P01 今天页的读状态（PRD M03 OP-08）。
 *
 * 一次查询同时取未完成待办、分支与最近有效提交；读取失败保留外框并给重试，
 * 不把部分结果拼成看似成功的页面。
 */
export function useTodayData(ownerId = LOCAL_OWNER_ID, commitLimit = 3): TodayDataView {
  const [attempt, setAttempt] = useState(0);
  const result = useLiveQuery(async () => {
    try {
      const [tasks, branches, commits] = await Promise.all([
        taskRepository.listOpenByOwner(ownerId),
        branchRepository.listByOwner(ownerId),
        commitRepository.listRecent(ownerId, commitLimit),
      ]);
      return { ok: true as const, tasks, branches, commits };
    } catch {
      return { ok: false as const, tasks: [], branches: [], commits: [] };
    }
  }, [ownerId, commitLimit, attempt]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const todayDate = today(systemClock);

  if (result === undefined) {
    return { status: 'loading', tasks: [], branches: [], commits: [], todayDate, retry };
  }
  if (!result.ok) {
    return { status: 'error', tasks: [], branches: [], commits: [], todayDate, retry };
  }
  return {
    status: 'ready',
    tasks: result.tasks,
    branches: result.branches,
    commits: result.commits,
    todayDate,
    retry,
  };
}

export interface AllTodosView {
  status: 'loading' | 'ready' | 'error';
  tasks: Task[];
  branches: Branch[];
  todayDate: string;
  retry: () => void;
}

/** `/today/all` 的读状态；数据范围与今天页相同，只是分组与筛选不同。 */
export function useAllTodosData(ownerId = LOCAL_OWNER_ID): AllTodosView {
  const [attempt, setAttempt] = useState(0);
  const result = useLiveQuery(async () => {
    try {
      const [tasks, branches] = await Promise.all([
        taskRepository.listOpenByOwner(ownerId),
        branchRepository.listByOwner(ownerId),
      ]);
      return { ok: true as const, tasks, branches };
    } catch {
      return { ok: false as const, tasks: [], branches: [] };
    }
  }, [ownerId, attempt]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const todayDate = today(systemClock);

  if (result === undefined) {
    return { status: 'loading', tasks: [], branches: [], todayDate, retry };
  }
  if (!result.ok) {
    return { status: 'error', tasks: [], branches: [], todayDate, retry };
  }
  return {
    status: 'ready',
    tasks: result.tasks,
    branches: result.branches,
    todayDate,
    retry,
  };
}

export interface TaskDetailView {
  status: 'loading' | 'ready' | 'error';
  task: Task | null;
  branches: Branch[];
  events: EventRecord[];
  retry: () => void;
}

/** 待办详情（O02）：单条待办、可接收分支与该待办的历史事件。 */
export function useTaskDetail(taskId: string | null, ownerId = LOCAL_OWNER_ID): TaskDetailView {
  const [attempt, setAttempt] = useState(0);
  const result = useLiveQuery(async () => {
    if (!taskId) return { ok: true as const, task: null, branches: [], events: [] };
    try {
      const [task, branches, events] = await Promise.all([
        taskRepository.getById(taskId),
        branchRepository.listByOwner(ownerId),
        eventRepository.listByEntity(taskId),
      ]);
      return { ok: true as const, task: task ?? null, branches, events };
    } catch {
      return { ok: false as const, task: null, branches: [], events: [] };
    }
  }, [taskId, ownerId, attempt]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  if (result === undefined) {
    return { status: 'loading', task: null, branches: [], events: [], retry };
  }
  if (!result.ok) {
    return { status: 'error', task: null, branches: [], events: [], retry };
  }
  return {
    status: 'ready',
    task: result.task,
    branches: result.branches,
    events: result.events,
    retry,
  };
}

export function useBadges(ownerId = LOCAL_OWNER_ID) {
  return useLiveQuery(() => badgeRepository.listByOwner(ownerId), [ownerId]);
}

/**
 * 偏好读数。`loaded = false` 表示查询尚未完成；行不存在时按默认值返回并视为已加载，
 * 这样设置页不会把「首次使用」误判为加载中，也不会在读到旧行时闪烁。
 */
export function useSettingsState(ownerId = LOCAL_OWNER_ID) {
  const row = useLiveQuery(async () => {
    try {
      return (await settingsRepository.getByOwner(ownerId)) ?? null;
    } catch {
      // 读取失败由工作区外壳的错误态统一承接；这里回落默认偏好，避免整页白屏。
      return null;
    }
  }, [ownerId]);

  const settings: SettingsFields = {
    theme: normalizeTheme(row?.theme),
    treeDensity: resolveTreeDensity(row?.treeDensity).density,
    annotations: normalizeAnnotationMode(row?.annotations),
    reminderEnabled: row?.reminderEnabled ?? DEFAULT_SETTINGS.reminderEnabled,
    lastAutoBackupAt: row?.lastAutoBackupAt ?? null,
  };

  return { loaded: row !== undefined, settings };
}

export function useRecentEvents(ownerId = LOCAL_OWNER_ID, limit = 20) {
  return useLiveQuery(() => eventRepository.listRecent(ownerId, limit), [ownerId, limit]);
}

export type StorageStatus = 'checking' | 'ready' | 'error';

/**
 * 本机库可用性（M01 OP-08）。
 *
 * 打开工作区时先探测一次 `db.open()`；失败时外壳保留顶栏与导航，
 * 主区显示可读原因与「重试」，不清空、不新建空库覆盖已有数据。
 */
export function useStorageReady() {
  const [status, setStatus] = useState<StorageStatus>('checking');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus('checking');

    void (async () => {
      try {
        await db.open();
        if (active) setStatus('ready');
      } catch {
        if (active) setStatus('error');
      }
    })();

    return () => {
      active = false;
    };
  }, [attempt]);

  return {
    status,
    retry: () => setAttempt((value) => value + 1),
  };
}

export interface CommitDetailView {
  status: 'loading' | 'ready' | 'error';
  commit: Commit | null;
  branches: Branch[];
  task: Task | null;
  /** 同一来源分支的全部提交，供 `core/rules/commit-neighbors` 找前后节点。 */
  siblings: Commit[];
  retry: () => void;
}

/**
 * O03 提交详情（PRD M05 OP-01）。
 *
 * 一次读取提交、关联待办、分支与同源提交；锁定判定在渲染时按当前时区计算，
 * 不写回 `date` / `at`。
 */
export function useCommitDetail(commitId: string | null): CommitDetailView {
  const [attempt, setAttempt] = useState(0);
  const result = useLiveQuery(async () => {
    try {
      const commit = commitId ? await commitRepository.getById(commitId) : undefined;
      const ownerId = commit?.ownerId ?? LOCAL_OWNER_ID;
      const [branches, task, siblings] = await Promise.all([
        branchRepository.listByOwner(ownerId),
        commit?.taskId ? taskRepository.getById(commit.taskId) : Promise.resolve(undefined),
        commit ? commitRepository.listBySourceBranch(commit.sourceBranchId) : Promise.resolve([]),
      ]);
      return { ok: true as const, commit: commit ?? null, branches, task: task ?? null, siblings };
    } catch {
      return {
        ok: false as const,
        commit: null,
        branches: [] as Branch[],
        task: null,
        siblings: [] as Commit[],
      };
    }
  }, [commitId, attempt]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  if (result === undefined) {
    return { status: 'loading', commit: null, branches: [], task: null, siblings: [], retry };
  }
  if (!result.ok) {
    return { status: 'error', commit: null, branches: [], task: null, siblings: [], retry };
  }
  return {
    status: 'ready',
    commit: result.commit,
    branches: result.branches,
    task: result.task,
    siblings: result.siblings,
    retry,
  };
}
