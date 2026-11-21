import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { currentTzOffset, systemClock, today } from '@/core/clock';
import { normalizeAnnotationMode } from '@/core/rules/annotation-visibility';
import { collectSubtree } from '@/core/rules/branch-path';
import { assessDelete, type DeleteGuard } from '@/core/rules/delete-guard';
import { assessFinish, type FinishPrecheck } from '@/core/rules/finish-precheck';
import { planFinishMigration, type FinishPlan } from '@/core/rules/finish-plan';
import { stallReminders } from '@/core/rules/stagnation';
import { pickWeekQuestion, type WeekQuestion } from '@/core/rules/week-question';
import {
  assessWeekReview,
  collectWeekCommits,
  isWeekReviewDay,
  type WeekReviewStats,
} from '@/core/rules/week-review';
import {
  resolveBadgeView,
  type BadgeJumpTarget,
  type BadgeSourceState,
} from '@/core/rules/badge-view';
import { onboardingDataFrom, type OnboardingData } from '@/core/rules/onboarding-state';
import { SAMPLE_OWNER_ID } from '@/core/rules/sample-tree';
import { normalizeTheme } from '@/core/rules/theme-preference';
import { resolveTreeDensity } from '@/core/rules/tree-density';
import { buildYearDistribution, type YearDistribution } from '@/core/rules/year-distribution';
import { computeYearMetrics, type YearMetrics } from '@/core/rules/year-metrics';
import { yearBoundsFor } from '@/core/rules/year-param';
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
  yearReviewRepository,
} from './repositories';
import type { Badge, Branch, Commit, EventRecord, Milestone, Task } from './types';

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

export interface BadgeListViewRow {
  badge: Badge;
  state: BadgeSourceState;
  jump: BadgeJumpTarget | null;
}

export interface BadgesListView {
  status: 'loading' | 'ready' | 'error';
  rows: BadgeListViewRow[];
  retry: () => void;
}

/**
 * 「我的」与今天页共用的徽章列表（M11）。
 *
 * 按 `grantedAt` 倒序；跳转与撤销标注由 `resolveBadgeView` 按当前数据计算，
 * 读取失败返回 `error`，不用空列表冒充「还没有徽章」。
 */
export function useBadgeRows(ownerId = LOCAL_OWNER_ID): BadgesListView {
  const [attempt, setAttempt] = useState(0);
  const result = useLiveQuery(async () => {
    try {
      const [badges, branches, commits, milestones] = await Promise.all([
        badgeRepository.listByOwner(ownerId),
        branchRepository.listByOwner(ownerId),
        commitRepository.listByOwner(ownerId),
        milestoneRepository.listByOwner(ownerId),
      ]);
      const tz = currentTzOffset(systemClock.now());
      const rows = badges
        .slice()
        .sort(
          (left, right) =>
            right.grantedAt - left.grantedAt ||
            right.createdAt - left.createdAt ||
            left.id.localeCompare(right.id),
        )
        .map((badge) => {
          const view = resolveBadgeView(
            {
              catalogId: badge.catalogId,
              sourceEntityId: badge.sourceEntityId,
              snapshot: badge.snapshot,
            },
            { branches, commits, milestones },
            tz,
          );
          return { badge, state: view.state, jump: view.jump };
        });
      return { ok: true as const, rows };
    } catch {
      return { ok: false as const, rows: [] as BadgeListViewRow[] };
    }
  }, [ownerId, attempt]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  if (result === undefined) return { status: 'loading', rows: [], retry };
  if (!result.ok) return { status: 'error', rows: [], retry };
  return { status: 'ready', rows: result.rows, retry };
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

export interface HistoryDataView {
  status: 'loading' | 'ready' | 'error';
  branches: Branch[];
  commits: Commit[];
  milestones: Milestone[];
  retry: () => void;
}

const EMPTY_HISTORY = {
  branches: [] as Branch[],
  commits: [] as Commit[],
  milestones: [] as Milestone[],
};

/**
 * P04 历程的读状态（M06 OP-01/OP-02/OP-03/OP-08）。
 *
 * 一次读分支、提交与里程碑；读取失败时保留上一次成功的数据，
 * 图表区只给出说明与重试，不清空已加载区间。
 */
export function useHistoryData(ownerId = LOCAL_OWNER_ID): HistoryDataView {
  const [attempt, setAttempt] = useState(0);
  const [cache, setCache] = useState<{
    branches: Branch[];
    commits: Commit[];
    milestones: Milestone[];
  } | null>(null);
  const result = useLiveQuery(async () => {
    try {
      const [branches, commits, milestones] = await Promise.all([
        branchRepository.listByOwner(ownerId),
        commitRepository.listByOwner(ownerId),
        milestoneRepository.listByOwner(ownerId),
      ]);
      return { ok: true as const, branches, commits, milestones };
    } catch {
      return { ok: false as const, ...EMPTY_HISTORY };
    }
  }, [ownerId, attempt]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    if (result?.ok) {
      setCache({
        branches: result.branches,
        commits: result.commits,
        milestones: result.milestones,
      });
    }
  }, [result]);

  const fallback = cache ?? EMPTY_HISTORY;
  if (result === undefined) return { status: 'loading', ...fallback, retry };
  if (!result.ok) return { status: 'error', ...fallback, retry };
  return {
    status: 'ready',
    branches: result.branches,
    commits: result.commits,
    milestones: result.milestones,
    retry,
  };
}

/**
 * 今天页停滞提醒（M06 OP-07）。
 *
 * 只读派生，不落库；取停滞天数最多的 5 条，无停滞时返回空数组，
 * 区块不渲染、不占位。
 */
export function useStallReminders(todayDate: string, ownerId = LOCAL_OWNER_ID) {
  const data = useLiveQuery(async () => {
    try {
      const [branches, commits] = await Promise.all([
        branchRepository.listByOwner(ownerId),
        commitRepository.listByOwner(ownerId),
      ]);
      return { ok: true as const, branches, commits };
    } catch {
      return { ok: false as const, branches: [] as Branch[], commits: [] as Commit[] };
    }
  }, [ownerId]);
  const tzOffset = currentTzOffset(systemClock.now());

  return useMemo(() => {
    if (!data?.ok) return [];
    return stallReminders(data.branches, data.commits, {
      todayDate,
      tzOffsetMinutes: tzOffset,
      range: { start: null },
    });
  }, [data, todayDate, tzOffset]);
}

export interface MilestoneDetailView {
  status: 'loading' | 'ready' | 'error';
  milestone: Milestone | null;
  branch: Branch | null;
  branches: Branch[];
  siblings: Milestone[];
  retry: () => void;
}

/** S04 里程碑详情的读状态（M07 OP-03）。 */
export function useMilestoneDetail(
  milestoneId: string | null,
  ownerId = LOCAL_OWNER_ID,
): MilestoneDetailView {
  const [attempt, setAttempt] = useState(0);
  const result = useLiveQuery(async () => {
    if (!milestoneId) {
      return {
        ok: true as const,
        milestone: null,
        branches: [] as Branch[],
        siblings: [] as Milestone[],
      };
    }
    try {
      const milestone = await milestoneRepository.getById(milestoneId);
      if (!milestone || milestone.deletedAt !== null) {
        return {
          ok: true as const,
          milestone: null,
          branches: [] as Branch[],
          siblings: [] as Milestone[],
        };
      }
      const [branches, siblings] = await Promise.all([
        branchRepository.listByOwner(ownerId),
        milestoneRepository.listByBranch(milestone.branchId),
      ]);
      return { ok: true as const, milestone, branches, siblings };
    } catch {
      return {
        ok: false as const,
        milestone: null,
        branches: [] as Branch[],
        siblings: [] as Milestone[],
      };
    }
  }, [milestoneId, ownerId, attempt]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  if (result === undefined) {
    return {
      status: 'loading',
      milestone: null,
      branch: null,
      branches: [],
      siblings: [],
      retry,
    };
  }
  if (!result.ok) {
    return {
      status: 'error',
      milestone: null,
      branch: null,
      branches: [],
      siblings: [],
      retry,
    };
  }
  const branch = result.milestone
    ? (result.branches.find((row) => row.id === result.milestone?.branchId) ?? null)
    : null;
  return {
    status: 'ready',
    milestone: result.milestone,
    branch,
    branches: result.branches,
    siblings: result.siblings,
    retry,
  };
}

export interface BranchFinishView {
  status: 'loading' | 'ready' | 'error';
  precheck: FinishPrecheck | null;
  plan: FinishPlan | null;
  retry: () => void;
}

/**
 * 收尾预检（M08 OP-01）。
 *
 * 读取分支结构、本分支待办与提交，算出合并去向、提交数、未完成待办数与不可收尾原因；
 * 只读派生，不落库。确认面板打开时计算，失败不打开确认框。
 */
export function useBranchFinishPlan(branchId: string | undefined): BranchFinishView {
  const [attempt, setAttempt] = useState(0);
  const result = useLiveQuery(async () => {
    try {
      if (!branchId) return { ok: true as const, precheck: null, plan: null };
      const [subject, branches, tasks, commits] = await Promise.all([
        branchRepository.getById(branchId),
        branchRepository.listByOwner(LOCAL_OWNER_ID),
        taskRepository.listByOwner(LOCAL_OWNER_ID),
        commitRepository.listByOwner(LOCAL_OWNER_ID),
      ]);
      if (!subject || subject.deletedAt !== null) {
        return { ok: true as const, precheck: null, plan: null };
      }
      const live = branches.filter((branch) => branch.deletedAt === null);
      const parent = subject.parentId
        ? live.find((branch) => branch.id === subject.parentId)
        : undefined;
      const descendants = collectSubtree(live, subject.path).filter(
        (branch) => branch.id !== subject.id,
      );
      const plan = planFinishMigration(subject.id, tasks, commits, []);
      const precheck = assessFinish({
        subject,
        parent,
        descendants,
        commitCount: plan.movedCommits.length,
        openTaskCount: plan.movedTasks.length,
      });
      return { ok: true as const, precheck, plan };
    } catch {
      return { ok: false as const, precheck: null, plan: null };
    }
  }, [branchId, attempt]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  if (result === undefined) return { status: 'loading', precheck: null, plan: null, retry };
  if (!result.ok) return { status: 'error', precheck: null, plan: null, retry };
  return { status: 'ready', precheck: result.precheck, plan: result.plan, retry };
}

export interface BranchDeleteView {
  status: 'loading' | 'ready' | 'error';
  guard: DeleteGuard | null;
  retry: () => void;
}
/**
 * 删除空分支前的整棵子树检查（M08 OP-06）。
 *
 * 逐条返回待办、提交、里程碑、子分支与历史痕迹原因；检查未通过时不显示确认框。
 */
export function useBranchDeleteGuard(branchId: string | undefined): BranchDeleteView {
  const [attempt, setAttempt] = useState(0);
  const result = useLiveQuery(async () => {
    try {
      if (!branchId) return { ok: true as const, guard: null };
      const [subject, branches, tasks, commits, milestones, events] = await Promise.all([
        branchRepository.getById(branchId),
        branchRepository.listByOwner(LOCAL_OWNER_ID),
        taskRepository.listByOwner(LOCAL_OWNER_ID),
        commitRepository.listByOwner(LOCAL_OWNER_ID),
        milestoneRepository.listByOwner(LOCAL_OWNER_ID),
        eventRepository.listRecent(LOCAL_OWNER_ID, Number.MAX_SAFE_INTEGER),
      ]);
      if (!subject || subject.deletedAt !== null) {
        return { ok: true as const, guard: null };
      }
      const live = branches.filter((branch) => branch.deletedAt === null);
      const subtree = collectSubtree(live, subject.path);
      const guard = assessDelete({ subject, subtree, tasks, commits, milestones, events });
      return { ok: true as const, guard };
    } catch {
      return { ok: false as const, guard: null };
    }
  }, [branchId, attempt]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  if (result === undefined) return { status: 'loading', guard: null, retry };
  if (!result.ok) return { status: 'error', guard: null, retry };
  return { status: 'ready', guard: result.guard, retry };
}

export interface OnboardingDataView {
  status: 'loading' | 'ready' | 'error';
  data: OnboardingData;
  branches: Branch[];
  rootId: string | null;
  firstOpenTask: Task | null;
  firstCommit: Commit | null;
  retry: () => void;
}

/**
 * 首次引导的数据来源（M12 OP-01）。
 *
 * 步骤由真实数据推导；同时给出根分支与最早一条未完成待办，
 * 供卡片在第 2/3 步默认落点和第 3/3 步直接完成。
 */
export function useOnboardingData(ownerId = LOCAL_OWNER_ID): OnboardingDataView {
  const [attempt, setAttempt] = useState(0);
  const result = useLiveQuery(async () => {
    try {
      const [branches, tasks, commits, milestones] = await Promise.all([
        branchRepository.listByOwner(ownerId),
        taskRepository.listByOwner(ownerId),
        commitRepository.listByOwner(ownerId),
        milestoneRepository.listByOwner(ownerId),
      ]);
      const root =
        branches
          .filter((branch) => branch.deletedAt === null && branch.parentId === null)
          .sort(
            (left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id),
          )[0] ?? null;
      const firstOpenTask =
        tasks
          .filter((task) => task.deletedAt === null && task.status === 'open')
          .sort(
            (left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id),
          )[0] ?? null;
      const firstCommit =
        commits
          .filter((commit) => commit.deletedAt === null && commit.voidedAt === null)
          .sort((left, right) => left.at - right.at || left.id.localeCompare(right.id))[0] ?? null;
      return {
        ok: true as const,
        data: onboardingDataFrom({ branches, tasks, commits, milestones }),
        branches,
        rootId: root?.id ?? null,
        firstOpenTask,
        firstCommit,
      };
    } catch {
      return {
        ok: false as const,
        data: EMPTY_ONBOARDING_DATA,
        branches: [],
        rootId: null,
        firstOpenTask: null,
        firstCommit: null,
      };
    }
  }, [ownerId, attempt]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  if (result === undefined) {
    return {
      status: 'loading',
      data: EMPTY_ONBOARDING_DATA,
      branches: [],
      rootId: null,
      firstOpenTask: null,
      firstCommit: null,
      retry,
    };
  }
  if (!result.ok) {
    return {
      status: 'error',
      data: EMPTY_ONBOARDING_DATA,
      branches: [],
      rootId: null,
      firstOpenTask: null,
      firstCommit: null,
      retry,
    };
  }
  return {
    status: 'ready',
    data: result.data,
    branches: result.branches,
    rootId: result.rootId,
    firstOpenTask: result.firstOpenTask,
    firstCommit: result.firstCommit,
    retry,
  };
}

const EMPTY_ONBOARDING_DATA: OnboardingData = {
  extraBranchCount: 0,
  taskCount: 0,
  commitCount: 0,
  milestoneCount: 0,
};

export interface SampleTreeView {
  status: 'loading' | 'ready' | 'error';
  branches: Branch[];
  commits: Commit[];
  milestones: Milestone[];
  retry: () => void;
}

/** 只读的示例命名空间（M12 OP-05）；真实读路径不会看到这些行。 */
export function useSampleTree(): SampleTreeView {
  const [attempt, setAttempt] = useState(0);
  const result = useLiveQuery(async () => {
    try {
      const [branches, commits, milestones] = await Promise.all([
        branchRepository.listByOwner(SAMPLE_OWNER_ID),
        commitRepository.listByOwner(SAMPLE_OWNER_ID),
        milestoneRepository.listByOwner(SAMPLE_OWNER_ID),
      ]);
      return {
        ok: true as const,
        branches: branches
          .slice()
          .sort((left, right) => left.depth - right.depth || left.order - right.order),
        commits: commits.slice().sort((left, right) => right.at - left.at),
        milestones: milestones.slice().sort((left, right) => right.achievedAt - left.achievedAt),
      };
    } catch {
      return { ok: false as const, branches: [], commits: [], milestones: [] };
    }
  }, [attempt]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  if (result === undefined) {
    return { status: 'loading', branches: [], commits: [], milestones: [], retry };
  }
  if (!result.ok) {
    return { status: 'error', branches: [], commits: [], milestones: [], retry };
  }
  return { status: 'ready', ...result, retry };
}

export interface DataOverviewCounts {
  branches: number;
  tasks: number;
  commits: number;
  milestones: number;
  badges: number;
}

export interface DataOverviewView {
  status: 'loading' | 'ready' | 'error';
  counts: DataOverviewCounts;
  lastExportAt: number | null;
  hasData: boolean;
  retry: () => void;
}

const EMPTY_DATA_COUNTS: DataOverviewCounts = {
  branches: 0,
  tasks: 0,
  commits: 0,
  milestones: 0,
  badges: 0,
};

/**
 * P08 数据概览（M10 OP-02）。
 *
 * 五类实体计数与最近一次导出的时间；最近导出时间由最新的 `data.export` 事件推导，
 * 不给 `settings` 增加字段。只有根分支、没有待办/提交/里程碑/徽章时视为「没有可导出的数据」。
 */
export function useDataOverview(ownerId = LOCAL_OWNER_ID): DataOverviewView {
  const [attempt, setAttempt] = useState(0);
  const result = useLiveQuery(async () => {
    try {
      const [branches, tasks, commits, milestones, badges, events] = await Promise.all([
        branchRepository.listByOwner(ownerId),
        taskRepository.listByOwner(ownerId),
        commitRepository.listByOwner(ownerId),
        milestoneRepository.listByOwner(ownerId),
        badgeRepository.listByOwner(ownerId),
        eventRepository.listRecent(ownerId, Number.MAX_SAFE_INTEGER),
      ]);
      const exported = events.find((event) => event.action === 'data.export');
      return {
        ok: true as const,
        counts: {
          branches: branches.length,
          tasks: tasks.length,
          commits: commits.length,
          milestones: milestones.length,
          badges: badges.length,
        },
        lastExportAt: exported?.at ?? null,
        hasData:
          branches.some((branch) => branch.depth > 0) ||
          tasks.length + commits.length + milestones.length + badges.length > 0,
      };
    } catch {
      return {
        ok: false as const,
        counts: EMPTY_DATA_COUNTS,
        lastExportAt: null,
        hasData: false,
      };
    }
  }, [ownerId, attempt]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  if (result === undefined) {
    return {
      status: 'loading',
      counts: EMPTY_DATA_COUNTS,
      lastExportAt: null,
      hasData: false,
      retry,
    };
  }
  if (!result.ok) {
    return {
      status: 'error',
      counts: EMPTY_DATA_COUNTS,
      lastExportAt: null,
      hasData: false,
      retry,
    };
  }
  return {
    status: 'ready',
    counts: result.counts,
    lastExportAt: result.lastExportAt,
    hasData: result.hasData,
    retry,
  };
}

export interface WeekReviewView {
  status: 'loading' | 'ready' | 'error';
  stats: WeekReviewStats | null;
  question: WeekQuestion | null;
  retry: () => void;
}

/**
 * 周回顾（M09 OP-01–OP-05）。
 *
 * 只在当地周六/周日晚间查询；全部现算、不落库。非周末直接返回不可见，
 * 不渲染骨架也不占位。读取失败保留卡片标题，由面板给出重试。
 */
export function useWeekReview(): WeekReviewView {
  const [attempt, setAttempt] = useState(0);
  const todayDate = today(systemClock);
  const weekend = isWeekReviewDay(todayDate);

  const result = useLiveQuery(async () => {
    try {
      if (!weekend) return { ok: true as const, stats: null, question: null };
      const [commits, branches] = await Promise.all([
        commitRepository.listByOwner(LOCAL_OWNER_ID),
        branchRepository.listByOwner(LOCAL_OWNER_ID),
      ]);
      const stats = assessWeekReview({ todayDate, commits, branches });
      const question = stats.visible
        ? pickWeekQuestion({ commits: collectWeekCommits(commits, todayDate), branches })
        : null;
      return { ok: true as const, stats, question };
    } catch {
      return { ok: false as const, stats: null, question: null };
    }
  }, [attempt, todayDate, weekend]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  if (!weekend) return { status: 'ready', stats: null, question: null, retry };
  if (result === undefined) return { status: 'loading', stats: null, question: null, retry };
  if (!result.ok) return { status: 'error', stats: null, question: null, retry };
  return { status: 'ready', stats: result.stats, question: result.question, retry };
}

export interface YearReviewDataView {
  status: 'loading' | 'ready' | 'error';
  branches: Branch[];
  commits: Commit[];
  earliestYear: number;
  note: string;
  metrics: YearMetrics;
  distribution: YearDistribution;
  retry: () => void;
}

const EMPTY_YEAR_METRICS: YearMetrics = {
  commits: 0,
  activeLevelOneBranches: 0,
  opened: 0,
  finished: 0,
};

/**
 * P05 年轮读状态（V1-02 OP-02–OP-04 / OP-07）。
 *
 * 一次读分支、提交与该年的年度总结，四项指标与分布全部现算；
 * 读取失败返回 `error` 且不保留上一次的数字，页面改用骨架与重试。
 */
export function useYearReviewData(
  year: number,
  todayDate: string,
  ownerId = LOCAL_OWNER_ID,
): YearReviewDataView {
  const [attempt, setAttempt] = useState(0);
  const result = useLiveQuery(async () => {
    try {
      const [branches, commits, review] = await Promise.all([
        branchRepository.listByOwner(ownerId),
        commitRepository.listByOwner(ownerId),
        yearReviewRepository.getByOwnerYear(ownerId, year),
      ]);
      return { ok: true as const, branches, commits, note: review?.note ?? '' };
    } catch {
      return {
        ok: false as const,
        branches: [] as Branch[],
        commits: [] as Commit[],
        note: '',
      };
    }
  }, [ownerId, year, attempt]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  const tzOffsetMinutes = currentTzOffset(systemClock.now());

  const derived = useMemo(() => {
    const branches = result?.ok ? result.branches : [];
    const commits = result?.ok ? result.commits : [];
    const bounds = yearBoundsFor({
      commits,
      branches,
      todayDate,
      tzOffsetMinutes,
    });
    return {
      earliestYear: bounds.earliestYear,
      metrics: computeYearMetrics({ year, commits, branches, tzOffsetMinutes }),
      distribution: buildYearDistribution({ year, commits, branches, todayDate }),
    };
  }, [result, year, todayDate, tzOffsetMinutes]);

  const base = {
    branches: result?.ok ? result.branches : [],
    commits: result?.ok ? result.commits : [],
    earliestYear: derived.earliestYear,
    note: result?.ok ? result.note : '',
    metrics: derived.metrics,
    distribution: derived.distribution,
    retry,
  };

  if (result === undefined) return { status: 'loading', ...base };
  if (!result.ok) {
    return {
      status: 'error',
      ...base,
      metrics: EMPTY_YEAR_METRICS,
      retry,
    };
  }
  return { status: 'ready', ...base };
}
