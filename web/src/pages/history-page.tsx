import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
} from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  TimelineChart,
  type TimelineConflictMarker,
  type TimelineHighlight,
  type TimelineLoadEarlierState,
} from '@/components/history/timeline-chart';
import { currentTzOffset, systemClock, today, toLocalDate } from '@/core/clock';
import { nextEarlierWindow } from '@/core/rules/history-window';
import { branchShadeForDepth, normalizeBranchColor } from '@/core/rules/branch-color';
import {
  filterBranchIds,
  resolveDirectTarget,
  type DirectTarget,
} from '@/core/rules/timeline-filter';
import { milestoneAnchor } from '@/core/rules/timeline-placement';
import { resolveTimeRange, TIME_RANGE_KINDS, type TimeRangeKind } from '@/core/rules/time-range';
import { buildBadgeMarkers } from '@/core/rules/badge-marker';
import { useBadges, useHistoryData } from '@/data/hooks';
import { useSyncSnapshot } from '@/data/sync-hooks';
import type { Branch, Commit, Milestone } from '@/data/types';
import { t, type MessageKey } from '@/i18n';
import { useHistoryExpandedStore, useHistoryFilterStore } from '@/stores/history.store';
import { useShellStore } from '@/stores/shell.store';
import { EmptyState } from '@/ui/empty-state';
import { ChevronDownIcon, DiamondIcon, MergeIcon } from '@/ui/icons';
import { SvgIcon } from '@/ui/icons/svg-icon';
import { PageShell } from '@/ui/page-shell';
import styles from './history-page.module.css';

const RANGE_LABEL_KEY: Record<TimeRangeKind, MessageKey> = {
  recent90: 'history.range.recent90',
  thisYear: 'history.range.thisYear',
  all: 'history.range.all',
};

const TREE_ICON = (
  <SvgIcon size={18}>
    <path d="M12 4v4.5M12 8.5H6.5v5M12 8.5h5.5v5" />
    <circle cx="12" cy="3.5" r="1.4" />
    <circle cx="6.5" cy="15" r="1.4" />
    <circle cx="17.5" cy="15" r="1.4" />
  </SvgIcon>
);

const DIAGONAL_ICON = (
  <SvgIcon size={15}>
    <path d="M7 17 17 7M9 7h8v8" />
  </SvgIcon>
);

function dottedDate(date: string): string {
  return date.split('-').join('.');
}

function branchTrail(branches: readonly Branch[], branchId: string): Branch[] {
  const byId = new Map(branches.map((branch) => [branch.id, branch]));
  const trail: Branch[] = [];
  const seen = new Set<string>();
  let cursor = byId.get(branchId);
  while (cursor && cursor.parentId !== null && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    trail.unshift(cursor);
    cursor = byId.get(cursor.parentId);
  }
  return trail;
}

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
  const badges = useBadges();
  const now = systemClock.now();
  const tz = currentTzOffset(now);
  const todayDate = today(systemClock, tz);
  const markers = useMemo(() => buildBadgeMarkers(badges ?? [], tz), [badges, tz]);
  const sync = useSyncSnapshot();
  const conflicts = useMemo<TimelineConflictMarker[]>(() => {
    const labelOf = (deviceId: string | null): string => {
      if (!deviceId) return t('history.conflict.unknownDevice');
      return sync.devices.find((device) => device.id === deviceId)?.label ?? deviceId;
    };
    return view.conflicts.map((conflict) => ({
      ...conflict,
      deviceLabel: labelOf(conflict.deviceId),
    }));
  }, [view.conflicts, sync.devices]);

  const saved = useHistoryFilterStore((state) => state.filter);
  const setRange = useHistoryFilterStore((state) => state.setRange);
  const setBranchId = useHistoryFilterStore((state) => state.setBranchId);
  const expanded = useHistoryExpandedStore((state) => state.expanded);
  const toggleExpanded = useHistoryExpandedStore((state) => state.toggleExpanded);
  const openOverlay = useShellStore((state) => state.openOverlay);
  const openCommitDetail = useShellStore((state) => state.openCommitDetail);
  const openMilestoneDetail = useShellStore((state) => state.openMilestoneDetail);
  const openMilestoneNew = useShellStore((state) => state.openMilestoneNew);
  const milestoneFocusId = useShellStore((state) => state.milestoneFocusId);
  const setMilestoneFocus = useShellStore((state) => state.setMilestoneFocus);

  const [searchParams, setSearchParams] = useSearchParams();
  const [loadedStart, setLoadedStart] = useState<string | null>(null);
  const [pendingStart, setPendingStart] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const branchMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!branchMenuOpen) return;
    const closeOnPointer = (event: MouseEvent): void => {
      if (!branchMenuRef.current?.contains(event.target as Node)) setBranchMenuOpen(false);
    };
    const closeOnKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setBranchMenuOpen(false);
    };
    document.addEventListener('mousedown', closeOnPointer);
    document.addEventListener('keydown', closeOnKey);
    return () => {
      document.removeEventListener('mousedown', closeOnPointer);
      document.removeEventListener('keydown', closeOnKey);
    };
  }, [branchMenuOpen]);

  useEffect(() => {
    setLoadedStart(null);
    setPendingStart(null);
    setLoadFailed(false);
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

  const branchOptions = useMemo(
    () => [
      { value: null as string | null, label: t('history.branch.all') },
      ...(root ? [{ value: root.id as string | null, label: root.title }] : []),
      ...levelOne.map((branch) => ({ value: branch.id as string | null, label: branch.title })),
    ],
    [levelOne, root],
  );
  const selectedBranchLabel =
    branchOptions.find((option) => option.value === saved.branchId)?.label ??
    t('history.branch.all');

  const earliest = useMemo(
    () => earliestActivity(liveBranches, view.commits, view.milestones, tz),
    [liveBranches, view.commits, view.milestones, tz],
  );

  const baseRange = resolveTimeRange(saved.range, todayDate);
  const boundedStart =
    loadedStart !== null && (baseRange.start === null || loadedStart < baseRange.start)
      ? loadedStart
      : baseRange.start;
  const effectiveRange = { ...baseRange, start: boundedStart };
  const earlierWindow = useMemo(
    () => nextEarlierWindow(saved.range, effectiveRange.start, earliest),
    [saved.range, effectiveRange.start, earliest],
  );
  const canLoadEarlier = earlierWindow.status === 'load';

  const focusMilestone = useMemo(
    () =>
      milestoneFocusId
        ? view.milestones.find((row) => row.id === milestoneFocusId && row.deletedAt === null)
        : undefined,
    [milestoneFocusId, view.milestones],
  );

  // 保存里程碑后把它所在的区间补进来，并在 2.5 秒后撤掉高亮。
  useEffect(() => {
    if (!focusMilestone) return;
    const anchor = milestoneAnchor(focusMilestone.achievedAt, focusMilestone.datePrecision, tz);
    if (baseRange.start !== null && anchor < baseRange.start) setLoadedStart(anchor);
  }, [focusMilestone, baseRange.start, tz]);

  useEffect(() => {
    if (!milestoneFocusId) return;
    const timer = window.setTimeout(() => setMilestoneFocus(null), 2500);
    return () => window.clearTimeout(timer);
  }, [milestoneFocusId, setMilestoneFocus]);

  const directTarget = useMemo<DirectTarget | null>(() => {
    if (focusMilestone) {
      return {
        branchId: focusMilestone.branchId,
        date: milestoneAnchor(focusMilestone.achievedAt, focusMilestone.datePrecision, tz),
      };
    }
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
  }, [focusMilestone, searchParams, view.commits, view.milestones, todayDate, tz]);

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
    if (focusMilestone) {
      return {
        branchId: focusMilestone.branchId,
        date: milestoneAnchor(focusMilestone.achievedAt, focusMilestone.datePrecision, tz),
        commitId: null,
        milestoneId: focusMilestone.id,
      };
    }
    if (!direct.target) return null;
    return {
      branchId: direct.target.branchId,
      date: direct.target.date,
      commitId: searchParams.get('commit'),
      milestoneId: searchParams.get('milestone'),
    };
  }, [focusMilestone, direct, searchParams, tz]);

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
      }) ||
      view.conflicts.some((conflict) => visible(conflict.branchId) && within(conflict.date))
    );
  }, [
    view.commits,
    view.milestones,
    view.conflicts,
    visibleIds,
    effectiveRange.start,
    effectiveRange.end,
    tz,
  ]);

  const rangeStartDate = effectiveRange.start ?? earliest;
  const rangeText =
    rangeStartDate === null
      ? `— ${dottedDate(effectiveRange.end)}`
      : `${dottedDate(rangeStartDate)} — ${dottedDate(effectiveRange.end)}`;
  const crossYear =
    rangeStartDate !== null && rangeStartDate.slice(0, 4) !== effectiveRange.end.slice(0, 4);
  const todayLabel = `${t('history.today')}${Number(todayDate.slice(5, 7))}${t(
    'history.axis.monthSuffix',
  )} ${Number(todayDate.slice(8, 10))}${t('history.daySuffix')}`;

  const milestoneRows = useMemo(() => {
    if (!hasVisibleEvents) return [];
    return view.milestones
      .filter((milestone) => milestone.deletedAt === null)
      .filter((milestone) => visibleIds === null || visibleIds.has(milestone.branchId))
      .map((milestone) => ({
        milestone,
        date: milestoneAnchor(milestone.achievedAt, milestone.datePrecision, tz),
        trail: branchTrail(liveBranches, milestone.branchId),
      }))
      .filter(
        (row) => row.date >= (effectiveRange.start ?? row.date) && row.date <= effectiveRange.end,
      )
      .sort(
        (left, right) =>
          right.date.localeCompare(left.date) ||
          right.milestone.achievedAt - left.milestone.achievedAt,
      );
  }, [
    hasVisibleEvents,
    view.milestones,
    visibleIds,
    liveBranches,
    effectiveRange.start,
    effectiveRange.end,
    tz,
  ]);

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

  // 加载更早区间：先记下目标起点，等数据可读后再整体替换区间，避免渲染半截时间线。
  useEffect(() => {
    if (pendingStart === null || view.status === 'loading') return;
    if (view.status === 'error') {
      setLoadFailed(true);
      return;
    }
    const next = pendingStart;
    setPendingStart(null);
    setLoadFailed(false);
    startTransition(() => setLoadedStart(next));
  }, [pendingStart, view.status, startTransition]);

  const handleLoadEarlier = useCallback(() => {
    if (isPending || pendingStart !== null) return;
    const next = nextEarlierWindow(saved.range, effectiveRange.start, earliest);
    if (next.status !== 'load') return;
    setLoadFailed(false);
    setPendingStart(next.start);
  }, [isPending, pendingStart, saved.range, effectiveRange.start, earliest]);

  const retryLoadEarlier = useCallback(() => {
    setLoadFailed(false);
    view.retry();
  }, [view]);

  const loadingEarlier = isPending || (pendingStart !== null && !loadFailed);
  const earlierState: TimelineLoadEarlierState = loadFailed
    ? 'error'
    : loadingEarlier
      ? 'loading'
      : canLoadEarlier
        ? 'available'
        : loadedStart !== null
          ? 'exhausted'
          : 'none';

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
    <PageShell
      titleKey="page.history.title"
      eyebrow={<span className={styles.eyebrow}>{t('history.eyebrow')}</span>}
      bodyKey="page.history.body"
      action={
        <Link className={styles.yearLink} to={`/history/${todayDate.slice(0, 4)}`}>
          {todayDate.slice(0, 4)} {t('history.year')}
          {DIAGONAL_ICON}
        </Link>
      }
    >
      <div className={styles.content}>
        <div className={styles.toolbar}>
          <div className={styles.segmented} role="group" aria-label={t('history.range.label')}>
            {TIME_RANGE_KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                className={styles.segment}
                aria-pressed={saved.range === kind}
                onClick={() => handleRangeChange(kind)}
              >
                {t(RANGE_LABEL_KEY[kind])}
              </button>
            ))}
          </div>

          <div className={styles.branchMenuWrap} ref={branchMenuRef}>
            <button
              type="button"
              className={styles.branchButton}
              aria-expanded={branchMenuOpen}
              aria-haspopup="listbox"
              onClick={() => setBranchMenuOpen((open) => !open)}
            >
              {selectedBranchLabel}
              <ChevronDownIcon size={14} />
            </button>
            {branchMenuOpen ? (
              <ul
                className={styles.branchMenu}
                role="listbox"
                aria-label={t('history.branch.menu')}
              >
                {branchOptions.map((option) => (
                  <li key={option.value ?? 'all'}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={saved.branchId === option.value}
                      className={styles.branchOption}
                      onClick={() => {
                        setBranchMenuOpen(false);
                        handleBranchChange(option.value);
                      }}
                    >
                      {option.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <span className={styles.rangeText} aria-label={rangeText}>
            {rangeStartDate !== null ? dottedDate(rangeStartDate) : null}
            <span className={styles.rangeDash}>—</span>
            {dottedDate(effectiveRange.end)}
          </span>
        </div>

        {direct.temporary && !focusMilestone ? (
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
              <div className={styles.emptyActions}>
                <button
                  type="button"
                  className={styles.backfill}
                  onClick={() => openOverlay('backfill')}
                >
                  {t('page.history.backfill')}
                </button>
                <Link className={styles.secondaryLink} to="/today">
                  {t('page.history.action')}
                </Link>
              </div>
            }
          />
        ) : view.status !== 'error' && !hasVisibleEvents ? (
          <EmptyState messageKey="history.empty.filtered" action={emptyAction} />
        ) : hasVisibleEvents ? (
          <>
            <section className={styles.panel}>
              <div className={styles.panelHead}>
                <div className={styles.panelTitle}>
                  {TREE_ICON}
                  <h2>{t('history.panel.tree')}</h2>
                </div>
                <span className={styles.today}>
                  <i aria-hidden="true" />
                  {todayLabel}
                </span>
              </div>
              <TimelineChart
                branches={liveBranches}
                commits={view.commits}
                milestones={view.milestones}
                badges={markers}
                conflicts={conflicts}
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
                earlierState={earlierState}
                onLoadEarlier={handleLoadEarlier}
                onRetryLoadEarlier={retryLoadEarlier}
                onOpenCommit={openCommitDetail}
                onOpenMilestone={openMilestoneDetail}
              />
              <div className={styles.legend}>
                <span>
                  <i className={styles.keyDot} aria-hidden="true" />
                  {t('history.legend.commit')}
                </span>
                <span>
                  <DiamondIcon size={13} />
                  {t('history.legend.milestone')}
                </span>
                <span>
                  <MergeIcon size={15} />
                  {t('history.legend.merge')}
                </span>
                <span>
                  <i className={styles.keyStall} aria-hidden="true" />
                  {t('history.legend.stall')}
                </span>
                <span>
                  <i className={styles.keyDropped} aria-hidden="true" />
                  {t('history.legend.dropped')}
                </span>
                <span>
                  <i className={styles.keyConflict} aria-hidden="true" />
                  {t('history.legend.conflict')}
                </span>
              </div>
            </section>

            <section className={styles.panel}>
              <div className={`${styles.panelHead} ${styles.milestonePanelHead}`}>
                <div className={styles.panelTitle}>
                  <DiamondIcon size={18} />
                  <h2>{t('history.milestones.title')}</h2>
                </div>
                <div className={styles.milestoneHeadRight}>
                  <span className={styles.panelCaption}>
                    {t(RANGE_LABEL_KEY[saved.range])} · {milestoneRows.length}
                    {t('history.milestones.countSuffix')}
                  </span>
                  <button
                    type="button"
                    className={styles.addMilestone}
                    onClick={() => openMilestoneNew(saved.branchId)}
                  >
                    {t('history.addMilestone')}
                  </button>
                </div>
              </div>
              {milestoneRows.length === 0 ? (
                <p className={styles.milestoneEmpty}>{t('history.milestones.empty')}</p>
              ) : (
                <div className={styles.milestoneRows}>
                  {milestoneRows.map(({ milestone, date, trail }) => {
                    const deepest = trail[trail.length - 1];
                    const color = deepest
                      ? `var(--${normalizeBranchColor(deepest.color)}-${branchShadeForDepth(
                          deepest.depth,
                        )})`
                      : 'var(--neutral)';
                    return (
                      <button
                        key={milestone.id}
                        type="button"
                        className={
                          crossYear
                            ? `${styles.milestoneRow} ${styles.milestoneRowWide}`
                            : styles.milestoneRow
                        }
                        onClick={() => openMilestoneDetail(milestone.id)}
                      >
                        <span className={styles.milestoneDate}>
                          {crossYear ? dottedDate(date) : dottedDate(date).slice(5)}
                        </span>
                        <strong className={styles.milestoneName}>{milestone.title}</strong>
                        <span className={styles.milestoneBranch}>
                          <i
                            className={styles.milestoneMark}
                            style={{ '--mark-color': color } as CSSProperties}
                            aria-hidden="true"
                          />
                          {trail.map((branch) => branch.title).join(' / ') ||
                            t('history.lane.root')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </PageShell>
  );
}
