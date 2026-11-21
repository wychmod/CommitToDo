import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { TimelineChart, type TimelineHighlight } from '@/components/history/timeline-chart';
import { addDays, currentTzOffset, systemClock, today, toLocalDate } from '@/core/clock';
import {
  filterBranchIds,
  resolveDirectTarget,
  type DirectTarget,
} from '@/core/rules/timeline-filter';
import { milestoneAnchor } from '@/core/rules/timeline-placement';
import { resolveTimeRange, TIME_RANGE_KINDS, type TimeRangeKind } from '@/core/rules/time-range';
import { useHistoryData } from '@/data/hooks';
import type { Branch, Commit, Milestone } from '@/data/types';
import { t, type MessageKey } from '@/i18n';
import { useHistoryExpandedStore, useHistoryFilterStore } from '@/stores/history.store';
import { useShellStore } from '@/stores/shell.store';
import { EmptyState } from '@/ui/empty-state';
import { PageShell } from '@/ui/page-shell';
import styles from './history-page.module.css';

const LOAD_STEP_DAYS = 90;

function isValidCommit(commit: Commit): boolean {
  return commit.voidedAt === null && commit.deletedAt === null;
}

function earliestActivity(
  branches: readonly Branch[],
  commits: readonly Commit[],
  milestones: readonly Milestone[],
  tz: number,
): string | null {
  let value: string | null = null;
  const take = (date: string): void => {
    if (value === null || date < value) value = date;
  };
  for (const commit of commits) {
    if (isValidCommit(commit)) take(commit.date);
  }
  for (const branch of branches) {
    if (branch.deletedAt === null) take(toLocalDate(branch.createdAt, tz));
  }
  for (const milestone of milestones) {
    take(milestoneAnchor(milestone.achievedAt, milestone.datePrecision, tz));
  }
  return value;
}

function HistorySkeleton() {
  return (
    <div className={styles.skeleton} role="status" aria-live="polite">
      <span className={styles.skeletonLabel}>{t('history.loading')}</span>
      {[0, 1, 2, 3].map((index) => (
        <span key={index} className={styles.skeletonRow} aria-hidden="true" />
      ))}
    </div>
  );
}

/**
 * P04 历程（M06）。
 *
 * 默认近 90 天、按一级分支分泳道；筛选与范围写入本机 UI 状态。
 * 直达通过查询参数传入，只临时显示目标泳道，不改写已保存的筛选。
 */
export function HistoryPage() {
  const view = useHistoryData();
  const now = systemClock.now();
  const tz = currentTzOffset(now);
  const todayDate = today(systemClock, tz);

  const saved = useHistoryFilterStore((state) => state.filter);
  const setRange = useHistoryFilterStore((state) => state.setRange);
  const setBranchId = useHistoryFilterStore((state) => state.setBranchId);
  const expanded = useHistoryExpandedStore((state) => state.expanded);
  const toggleExpanded = useHistoryExpandedStore((state) => state.toggleExpanded);
  const openCommitDetail = useShellStore((state) => state.openCommitDetail);
  const openMilestoneDetail = useShellStore((state) => state.openMilestoneDetail);

  const [searchParams, setSearchParams] = useSearchParams();
  const [extraStart, setExtraStart] = useState<string | null>(null);
  const loadingEarlier = useRef(false);

  useEffect(() => {
    setExtraStart(null);
  }, [saved.range, saved.branchId]);

  const liveBranches = useMemo(
    () => view.branches.filter((branch) => branch.deletedAt === null),
    [view.branches],
  );
  const root = liveBranches.find((branch) => branch.parentId === null);
  const levelOne = useMemo(
    () =>
      liveBranches
        .filter((branch) => branch.parentId === root?.id)
        .sort((a, b) => a.order - b.order),
    [liveBranches, root?.id],
  );

  const earliest = useMemo(
    () => earliestActivity(liveBranches, view.commits, view.milestones, tz),
    [liveBranches, view.commits, view.milestones, tz],
  );

  const baseRange = resolveTimeRange(saved.range, todayDate);
  const boundedStart =
    extraStart !== null && (baseRange.start === null || extraStart < baseRange.start)
      ? extraStart
      : baseRange.start;
  const effectiveRange = { ...baseRange, start: boundedStart };
  const canLoadEarlier =
    saved.range !== 'all' &&
    earliest !== null &&
    (effectiveRange.start === null || effectiveRange.start > earliest);

  const directTarget = useMemo<DirectTarget | null>(() => {
    const commitId = searchParams.get('commit');
    if (commitId) {
      const commit = view.commits.find((row) => row.id === commitId);
      if (commit) return { branchId: commit.branchId, date: commit.date };
    }
    const milestoneId = searchParams.get('milestone');
    if (milestoneId) {
      const milestone = view.milestones.find((row) => row.id === milestoneId);
      if (milestone) {
        return {
          branchId: milestone.branchId,
          date: milestoneAnchor(milestone.achievedAt, milestone.datePrecision, tz),
        };
      }
    }
    const branchId = searchParams.get('branch');
    if (branchId) return { branchId, date: searchParams.get('date') ?? todayDate };
    return null;
  }, [searchParams, view.commits, view.milestones, todayDate, tz]);

  const direct = useMemo(
    () => resolveDirectTarget(saved, liveBranches, directTarget),
    [saved, liveBranches, directTarget],
  );

  const visibleIds = useMemo(() => {
    const base = filterBranchIds(liveBranches, saved.branchId);
    if (!direct.temporary || direct.laneId === null || base === null) return base;
    const laneIds = filterBranchIds(liveBranches, direct.laneId);
    if (laneIds === null) return base;
    return new Set([...base, ...laneIds]);
  }, [liveBranches, saved.branchId, direct]);

  const highlight = useMemo<TimelineHighlight | null>(() => {
    if (!direct.target) return null;
    return {
      branchId: direct.target.branchId,
      date: direct.target.date,
      commitId: searchParams.get('commit'),
      milestoneId: searchParams.get('milestone'),
    };
  }, [direct, searchParams]);

  const chartExpanded = useMemo(() => {
    if (!direct.target) return expanded;
    const forced: Record<string, boolean> = {};
    if (direct.temporary && direct.laneId) forced[direct.laneId] = true;
    let cursor: Branch | undefined = liveBranches.find(
      (branch) => branch.id === direct.target!.branchId,
    );
    while (cursor && cursor.parentId && cursor.parentId !== root?.id) {
      forced[cursor.parentId] = true;
      cursor = liveBranches.find((branch) => branch.id === cursor?.parentId);
    }
    return { ...expanded, ...forced };
  }, [expanded, direct, liveBranches, root?.id]);

  const hasAnyActivity = view.commits.some(isValidCommit) || view.milestones.length > 0;
  const hasVisibleEvents = useMemo(() => {
    const within = (date: string): boolean =>
      date >= (effectiveRange.start ?? date) && date <= effectiveRange.end;
    const visible = (branchId: string): boolean => visibleIds === null || visibleIds.has(branchId);
    return (
      view.commits.some(
        (commit) => isValidCommit(commit) && visible(commit.branchId) && within(commit.date),
      ) ||
      view.milestones.some((milestone) => {
        const date = milestoneAnchor(milestone.achievedAt, milestone.datePrecision, tz);
        return visible(milestone.branchId) && within(date);
      })
    );
  }, [view.commits, view.milestones, visibleIds, effectiveRange.start, effectiveRange.end, tz]);

  const clearDirectParams = useCallback(() => {
    const keys = ['branch', 'date', 'commit', 'milestone'];
    if (!keys.some((key) => searchParams.has(key))) return;
    const next = new URLSearchParams(searchParams);
    for (const key of keys) next.delete(key);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleRangeChange = (kind: TimeRangeKind): void => {
    clearDirectParams();
    setRange(kind);
  };

  const handleBranchChange = (branchId: string | null): void => {
    clearDirectParams();
    setBranchId(branchId);
  };

  const handleLoadEarlier = useCallback(() => {
    if (!canLoadEarlier || loadingEarlier.current) return;
    loadingEarlier.current = true;
    const current = effectiveRange.start ?? earliest;
    if (current !== null && earliest !== null) {
      const next = addDays(current, -LOAD_STEP_DAYS);
      setExtraStart(next < earliest ? earliest : next);
    }
    window.setTimeout(() => {
      loadingEarlier.current = false;
    }, 200);
  }, [canLoadEarlier, effectiveRange.start, earliest]);

  const emptyAction =
    saved.branchId !== null ? (
      <button type="button" className={styles.action} onClick={() => handleBranchChange(null)}>
        {t('history.empty.clear')}
      </button>
    ) : (
      <Link className={styles.action} to="/today">
        {t('page.history.action')}
      </Link>
    );

  return (
    <PageShell titleKey="page.history.title" bodyKey="page.history.body">
      <div className={styles.filters}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{t('history.range.label')}</span>
          <select
            className={styles.select}
            value={saved.range}
            onChange={(event) => handleRangeChange(event.target.value as TimeRangeKind)}
          >
            {TIME_RANGE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {t(`history.range.${kind}` as MessageKey)}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>{t('history.branch.label')}</span>
          <select
            className={styles.select}
            value={saved.branchId ?? ''}
            onChange={(event) => handleBranchChange(event.target.value || null)}
          >
            <option value="">{t('history.branch.all')}</option>
            {root ? <option value={root.id}>{root.title}</option> : null}
            {levelOne.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {direct.temporary ? (
        <p className={styles.temporary} role="status">
          {t('history.direct.temporary')}
        </p>
      ) : null}

      {view.status === 'error' ? (
        <div className={styles.errorBanner} role="alert">
          <span>{t('history.loadFailed')}</span>
          <button type="button" className={styles.retry} onClick={view.retry}>
            {t('history.retry')}
          </button>
        </div>
      ) : null}

      {view.status === 'loading' && !hasAnyActivity ? (
        <HistorySkeleton />
      ) : view.status !== 'error' && !hasAnyActivity ? (
        <EmptyState
          messageKey="page.history.empty"
          action={
            <Link className={styles.action} to="/today">
              {t('page.history.action')}
            </Link>
          }
        />
      ) : view.status !== 'error' && !hasVisibleEvents ? (
        <EmptyState messageKey="history.empty.filtered" action={emptyAction} />
      ) : hasVisibleEvents ? (
        <TimelineChart
          branches={liveBranches}
          commits={view.commits}
          milestones={view.milestones}
          range={effectiveRange}
          visibleIds={visibleIds}
          expanded={chartExpanded}
          onToggle={(branchId) => {
            const branch = liveBranches.find((row) => row.id === branchId);
            const fallback = Boolean(
              branch && branch.parentId === root?.id && branch.archivedAt === null,
            );
            toggleExpanded(branchId, fallback);
          }}
          highlight={highlight}
          canLoadEarlier={canLoadEarlier}
          onLoadEarlier={handleLoadEarlier}
          onOpenCommit={openCommitDetail}
          onOpenMilestone={openMilestoneDetail}
        />
      ) : null}
    </PageShell>
  );
}
