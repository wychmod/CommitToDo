import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { currentTzOffset, systemClock, today, toLocalDate } from '@/core/clock';
import type { Branch, Commit, Milestone } from '@/data/types';
import { t, type MessageKey } from '@/i18n';
import type { TimelineConflict } from '@/core/rules/timeline-conflict';
import { ChevronDownIcon, ChevronRightIcon } from '@/ui/icons';
import styles from './timeline-chart.module.css';
import { clusterTimeline, type TimelineCluster } from '@/core/rules/timeline-cluster';
import {
  milestoneAnchor,
  placeBranchEnd,
  placeBranchStart,
  rootLaneVisible,
} from '@/core/rules/timeline-placement';
import { assessStall } from '@/core/rules/stagnation';
import type { TimeRange } from '@/core/rules/time-range';
import { daysBetween } from '@/core/rules/time-range';
import { branchShadeForDepth, normalizeBranchColor } from '@/core/rules/branch-color';
import { badgeNameKey } from '@/components/badges/badge-presentation';
import type { BadgeMarker } from '@/core/rules/badge-marker';

const LABEL_WIDTH_PX = 160;
const MIN_DAY_WIDTH_PX = 3;
const MIN_GAP_PX = 12;
const RIGHT_PAD_PX = 40;
/** 节点最大半宽（当天徽章 20px）；用于让区间首尾的节点不被面板边缘裁掉。 */
const EDGE_PAD_PX = 10;
const DAY_MS = 86_400_000;

export interface TimelineHighlight {
  branchId: string;
  date: string;
  commitId: string | null;
  milestoneId: string | null;
}

/** 冲突标记：设备已由页面解析成可读名称。 */
export interface TimelineConflictMarker extends TimelineConflict {
  deviceLabel: string;
}

/** 加载更早区间在图表顶部的四种可见状态。 */
export type TimelineLoadEarlierState = 'none' | 'available' | 'loading' | 'error' | 'exhausted';

interface TimelineChartProps {
  branches: readonly Branch[];
  commits: readonly Commit[];
  milestones: readonly Milestone[];
  badges: readonly BadgeMarker[];
  conflicts: readonly TimelineConflictMarker[];
  range: TimeRange;
  /** `null` 表示不筛选；否则只显示集合内的分支。 */
  visibleIds: Set<string> | null;
  expanded: Record<string, boolean>;
  onToggle: (branchId: string) => void;
  highlight: TimelineHighlight | null;
  earlierState: TimelineLoadEarlierState;
  onLoadEarlier: () => void;
  onRetryLoadEarlier: () => void;
  onOpenCommit: (commitId: string) => void;
  onOpenMilestone: (milestoneId: string) => void;
}

interface LaneEvent {
  id: string;
  at: number;
  /** 同一日期内的稳定顺序：里程碑按创建时刻，提交按发生时刻。 */
  sortKey: number;
  date: string;
  kind: 'commit' | 'milestone';
  title: string;
  commitId?: string;
  milestoneId?: string;
}

interface Lane {
  branch: Branch;
  depth: number;
  isRoot: boolean;
  hasChildren: boolean;
  expanded: boolean;
}

const pad2 = (value: number): string => value.toString().padStart(2, '0');

function dateToMs(date: string, tzOffsetMinutes: number, hour = 12): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year!, month! - 1, day!, hour) - tzOffsetMinutes * 60_000;
}

interface AxisTick {
  date: string;
  label: string;
  isNow: boolean;
}

function axisTickLabel(month: number, year: number, crossYear: boolean): string {
  return month === 1 && crossYear ? `${year}.01` : `${pad2(month)}.01`;
}

function monthTicks(
  start: string,
  end: string,
  todayDate: string,
  plotPxForDate: (date: string) => number,
): AxisTick[] {
  const startLabel = start.slice(5).replace('-', '.');
  const ticks: AxisTick[] = [{ date: start, label: startLabel, isNow: start === todayDate }];
  if (end <= start) return ticks;

  const startYear = Number(start.slice(0, 4));
  const startMonth = Number(start.slice(5, 7));
  const endYear = Number(end.slice(0, 4));
  const endMonth = Number(end.slice(5, 7));
  const crossYear = startYear !== endYear;
  const startPx = plotPxForDate(start);
  const endPx = plotPxForDate(end);

  let year = startYear;
  let month = startMonth + 1;
  while (year < endYear || (year === endYear && month <= endMonth)) {
    const date = `${year}-${pad2(month)}-01`;
    if (date > start && date < end) {
      const px = plotPxForDate(date);
      if (px - startPx >= 48 && endPx - px >= 48) {
        ticks.push({
          date,
          label: axisTickLabel(month, year, crossYear),
          isNow: date === todayDate,
        });
      }
    }
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  ticks.push({
    date: end,
    label: end.slice(5).replace('-', '.'),
    isNow: end === todayDate,
  });
  return ticks;
}

function isValidCommit(commit: Commit): boolean {
  return commit.voidedAt === null && commit.deletedAt === null;
}

const CONFLICT_ENTITY_KEYS: Record<string, MessageKey> = {
  branch: 'sync.entity.branch',
  task: 'sync.entity.task',
  commit: 'sync.entity.commit',
  milestone: 'sync.entity.milestone',
  badge: 'sync.entity.badge',
  settings: 'sync.entity.settings',
};

function conflictEntityLabel(entity: string): string {
  const key = CONFLICT_ENTITY_KEYS[entity];
  return key ? t(key) : t('history.conflict.unknownEntity');
}

/** 同一天只落一个标记；标记内列出当天的全部冲突。 */
function groupConflictsByDate(
  conflicts: readonly TimelineConflictMarker[],
  branchId: string,
  start: string,
  end: string,
): Array<[string, TimelineConflictMarker[]]> {
  const groups = new Map<string, TimelineConflictMarker[]>();
  for (const conflict of conflicts) {
    if (conflict.branchId !== branchId) continue;
    if (conflict.date < start || conflict.date > end) continue;
    const list = groups.get(conflict.date) ?? [];
    list.push(conflict);
    groups.set(conflict.date, list);
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function laneEvents(
  lane: Branch,
  commits: readonly Commit[],
  milestones: readonly Milestone[],
  tz: number,
): LaneEvent[] {
  const events: LaneEvent[] = [];
  for (const commit of commits) {
    if (commit.branchId !== lane.id || !isValidCommit(commit)) continue;
    events.push({
      id: commit.id,
      at: commit.at,
      sortKey: commit.at,
      date: commit.date,
      kind: 'commit',
      title: commit.summary,
      commitId: commit.id,
    });
  }
  for (const milestone of milestones) {
    if (milestone.branchId !== lane.id) continue;
    const date = milestoneAnchor(milestone.achievedAt, milestone.datePrecision, tz);
    events.push({
      id: milestone.id,
      at: dateToMs(date, tz),
      sortKey: milestone.createdAt,
      date,
      kind: 'milestone',
      title: milestone.title,
      milestoneId: milestone.id,
    });
  }
  return events.sort((a, b) => a.at - b.at || a.sortKey - b.sortKey || a.id.localeCompare(b.id));
}

/**
 * P04 时间树（M06 OP-01、OP-02、OP-03）。
 *
 * 桌面按真实时间比例横向排布泳道，390 px 改为纵向时间线；
 * 节点聚合、分叉/合回与停滞线型全部由 `core/rules` 的纯函数给出。
 */
export function TimelineChart({
  branches,
  commits,
  milestones,
  badges,
  conflicts,
  range,
  visibleIds,
  expanded,
  onToggle,
  highlight,
  earlierState,
  onLoadEarlier,
  onRetryLoadEarlier,
  onOpenCommit,
  onOpenMilestone,
}: TimelineChartProps) {
  const tz = currentTzOffset(systemClock.now());
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollArmed = useRef(true);
  const [viewportWidth, setViewportWidth] = useState(960);
  const [clusterOpen, setClusterOpen] = useState<{
    laneId: string;
    cluster: TimelineCluster<LaneEvent>;
  } | null>(null);
  const [markerOpen, setMarkerOpen] = useState<string | null>(null);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setViewportWidth(width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const root = useMemo(
    () => branches.find((branch) => branch.parentId === null && branch.deletedAt === null),
    [branches],
  );
  const childrenOf = useMemo(() => {
    const map = new Map<string, Branch[]>();
    for (const branch of branches) {
      if (branch.parentId === null || branch.deletedAt !== null) continue;
      const list = map.get(branch.parentId) ?? [];
      list.push(branch);
      map.set(branch.parentId, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.order - b.order);
    return map;
  }, [branches]);

  const lanes = useMemo(() => {
    const expandedFor = (branch: Branch): boolean => {
      const explicit = expanded[branch.id];
      if (explicit !== undefined) return explicit;
      return branch.parentId === root?.id && branch.archivedAt === null;
    };
    const visible = (branchId: string): boolean => visibleIds === null || visibleIds.has(branchId);

    const list: Lane[] = [];
    if (!root) return list;
    const rootActive = rootLaneVisible(root.id, commits, milestones, branches);
    if (visible(root.id) && rootActive) {
      list.push({ branch: root, depth: 0, isRoot: true, hasChildren: false, expanded: true });
    }

    const walk = (parentId: string, depth: number): void => {
      for (const branch of childrenOf.get(parentId) ?? []) {
        if (!visible(branch.id)) continue;
        const children = childrenOf.get(branch.id) ?? [];
        const open = expandedFor(branch);
        list.push({
          branch,
          depth,
          isRoot: false,
          hasChildren: children.length > 0,
          expanded: open,
        });
        if (open) walk(branch.id, depth + 1);
      }
    };
    walk(root.id, 1);
    return list;
  }, [root, childrenOf, branches, commits, milestones, visibleIds, expanded]);

  const earliest = useMemo(() => {
    let value = range.end;
    for (const commit of commits) {
      if (isValidCommit(commit) && commit.date < value) value = commit.date;
    }
    for (const branch of branches) {
      if (branch.deletedAt !== null) continue;
      const date = toLocalDate(branch.createdAt, tz);
      if (date < value) value = date;
    }
    for (const milestone of milestones) {
      const date = milestoneAnchor(milestone.achievedAt, milestone.datePrecision, tz);
      if (date < value) value = date;
    }
    return value;
  }, [branches, commits, milestones, range.end, tz]);

  const rangeStart = range.start ?? earliest;
  const totalDays = Math.max(1, daysBetween(rangeStart, range.end) + 1);
  const trackWidth = Math.max(viewportWidth - LABEL_WIDTH_PX, totalDays * MIN_DAY_WIDTH_PX);
  const plotWidth = Math.max(1, trackWidth - RIGHT_PAD_PX);
  const startCenterMs = dateToMs(rangeStart, tz, 12);
  const endCenterMs = dateToMs(range.end, tz, 12);
  const spanMs = Math.max(DAY_MS, endCenterMs - startCenterMs);
  const pxPerMs = plotWidth / spanMs;
  const plotPx = (ms: number): number =>
    Math.min(plotWidth, Math.max(0, ((ms - startCenterMs) / spanMs) * plotWidth));
  const msX = (ms: number): number => (plotPx(ms) / trackWidth) * 100;
  const dayX = (date: string): number => msX(dateToMs(date, tz, 12));
  // 首尾当天的节点会被面板边缘切掉一半，向内收一个节点半径。
  const markerX = (ms: number): number =>
    (Math.min(trackWidth - EDGE_PAD_PX, Math.max(EDGE_PAD_PX, plotPx(ms))) / trackWidth) * 100;

  const todayDate = today(systemClock, tz);
  const todayX = plotPx(dateToMs(todayDate, tz, 12));
  const renderedIds = useMemo(() => new Set(lanes.map((item) => item.branch.id)), [lanes]);
  const ticks = useMemo(
    () =>
      monthTicks(rangeStart, range.end, todayDate, (date) =>
        Math.min(
          plotWidth,
          Math.max(0, ((dateToMs(date, tz, 12) - startCenterMs) / spanMs) * plotWidth),
        ),
      ),
    [rangeStart, range.end, todayDate, tz, plotWidth, startCenterMs, spanMs],
  );
  const tickClass = (tick: AxisTick): string =>
    tick.isNow ? styles.tickNow : tick.date === rangeStart ? styles.tickStart : styles.tick;

  const markerByDate = useMemo(
    () => new Map(badges.map((marker) => [marker.date, marker])),
    [badges],
  );

  // 同一天只出现一个标记：按泳道顺序落到第一个当天有节点的泳道。
  const markerLane = useMemo(() => {
    const assigned = new Map<string, string>();
    for (const lane of lanes) {
      const events = laneEvents(lane.branch, commits, milestones, tz).filter(
        (event) => event.date >= rangeStart && event.date <= range.end,
      );
      for (const event of events) {
        if (!markerByDate.has(event.date) || assigned.has(event.date)) continue;
        assigned.set(event.date, lane.branch.id);
      }
    }
    return assigned;
  }, [lanes, commits, milestones, tz, rangeStart, range.end, markerByDate]);

  useEffect(() => {
    const element = scrollRef.current?.querySelector<HTMLElement>('[data-highlight="true"]');
    element?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [highlight]);

  const handleScroll = (): void => {
    const element = scrollRef.current;
    if (!element) return;
    // 离开左边界后重新武装，避免一次贴边连续触发多批加载。
    if (element.scrollLeft > 8) {
      scrollArmed.current = true;
      return;
    }
    if (earlierState !== 'available' || !scrollArmed.current) return;
    scrollArmed.current = false;
    onLoadEarlier();
  };

  const laneStyle = (lane: Lane): CSSProperties => {
    const color = lane.isRoot
      ? 'var(--neutral)'
      : `var(--${normalizeBranchColor(lane.branch.color)}-${branchShadeForDepth(lane.branch.depth)})`;
    return { '--lane-color': color } as CSSProperties;
  };

  const openLaneEvent = (event: LaneEvent): void => {
    if (event.commitId) onOpenCommit(event.commitId);
    if (event.milestoneId) onOpenMilestone(event.milestoneId);
  };

  const matchesHighlight = (laneId: string, event: LaneEvent): boolean => {
    if (!highlight) return false;
    if (highlight.commitId && highlight.commitId === event.commitId) return true;
    if (highlight.milestoneId && highlight.milestoneId === event.milestoneId) return true;
    return highlight.branchId === laneId && highlight.date === event.date;
  };

  return (
    <div className={styles.chart}>
      {earlierState !== 'none' ? (
        <div
          className={styles.loadEarlierBar}
          role={earlierState === 'error' ? 'alert' : undefined}
        >
          {earlierState === 'available' ? (
            <button type="button" className={styles.loadEarlier} onClick={onLoadEarlier}>
              {t('history.loadEarlier')}
            </button>
          ) : null}
          {earlierState === 'loading' ? (
            <span className={styles.loadEarlierState} role="status">
              {t('history.loadEarlier.loading')}
            </span>
          ) : null}
          {earlierState === 'error' ? (
            <>
              <span className={styles.loadEarlierState}>{t('history.loadEarlier.error')}</span>
              <button type="button" className={styles.loadEarlier} onClick={onRetryLoadEarlier}>
                {t('history.retry')}
              </button>
            </>
          ) : null}
          {earlierState === 'exhausted' ? (
            <span className={styles.loadEarlierState}>{t('history.loadEarlier.exhausted')}</span>
          ) : null}
        </div>
      ) : null}

      <div className={styles.desktopOnly} ref={scrollRef} onScroll={handleScroll}>
        <div className={styles.canvas} style={{ width: LABEL_WIDTH_PX + trackWidth }}>
          <div className={styles.axisRow}>
            <div className={styles.axisCorner} />
            <div className={styles.axisTrack} style={{ width: trackWidth }}>
              {ticks.map((tick) => (
                <span
                  key={tick.date}
                  className={tickClass(tick)}
                  style={{ left: `${dayX(tick.date)}%` }}
                >
                  {tick.label}
                </span>
              ))}
            </div>
          </div>

          <span
            className={styles.todayLine}
            style={{ left: LABEL_WIDTH_PX + todayX }}
            aria-hidden="true"
          />

          {lanes.map((lane) => {
            const branch = lane.branch;
            const events = laneEvents(branch, commits, milestones, tz).filter(
              (event) => event.date >= rangeStart && event.date <= range.end,
            );
            const clusters = clusterTimeline(events, { minGapPx: MIN_GAP_PX, pxPerMs });
            const stall = assessStall(branch, branches, commits, {
              todayDate: range.end,
              tzOffsetMinutes: tz,
              range: { start: rangeStart },
            });
            const fork = lane.isRoot ? null : placeBranchStart(branch, range, tz);
            const merge = lane.isRoot ? null : placeBranchEnd(branch, range, tz);
            const target = branch.finishedIntoId
              ? branches.find((row) => row.id === branch.finishedIntoId)
              : undefined;
            const laneHighlighted = highlight?.branchId === branch.id;
            const railStartPct = lane.isRoot ? 0 : dayX(toLocalDate(branch.createdAt, tz));
            const railEndDate =
              (stall.kind === 'stalled' || stall.kind === 'dropped') && stall.fromDate
                ? stall.fromDate
                : merge
                  ? merge.date
                  : range.end;
            const railWidthPct = Math.max(0, dayX(railEndDate) - railStartPct);

            return (
              <div
                className={styles.laneRow}
                key={branch.id}
                data-depth={lane.depth}
                data-highlighted={laneHighlighted ? 'true' : undefined}
                style={laneStyle(lane)}
              >
                <div className={styles.laneLabel}>
                  {lane.hasChildren ? (
                    <button
                      type="button"
                      className={styles.laneToggle}
                      aria-label={
                        lane.expanded ? t('history.lane.collapse') : t('history.lane.expand')
                      }
                      aria-expanded={lane.expanded}
                      onClick={() => onToggle(branch.id)}
                    >
                      <i className={styles.laneMark} aria-hidden="true" />
                      <span className={styles.laneName} title={branch.title}>
                        {branch.title}
                      </span>
                      <span
                        className={styles.laneChevron}
                        data-collapsed={!lane.expanded ? 'true' : undefined}
                        aria-hidden="true"
                      >
                        {lane.expanded ? (
                          <ChevronDownIcon size={12} />
                        ) : (
                          <ChevronRightIcon size={12} />
                        )}
                      </span>
                    </button>
                  ) : (
                    <span className={styles.laneStatic}>
                      <i className={styles.laneMark} aria-hidden="true" />
                      <span className={styles.laneName} title={branch.title}>
                        {branch.title}
                      </span>
                    </span>
                  )}
                  {branch.archivedAt !== null || branch.droppedAt !== null ? (
                    <span className={styles.laneStatus}>
                      {branch.archivedAt !== null ? t('history.archived') : t('history.dropped')}
                    </span>
                  ) : null}
                </div>

                <div className={styles.track} style={{ width: trackWidth }}>
                  <span
                    className={styles.rail}
                    style={{
                      left: `${railStartPct}%`,
                      width: `${railWidthPct}%`,
                    }}
                  />

                  {ticks.map((tick) => (
                    <span
                      key={tick.date}
                      className={styles.guide}
                      style={{ left: `${dayX(tick.date)}%` }}
                    />
                  ))}

                  {fork && branch.parentId !== null && renderedIds.has(branch.parentId) ? (
                    <span
                      className={styles.fork}
                      style={{ left: `${dayX(fork.date)}%` }}
                      title={`${t('history.fork')}${fork.date}`}
                    />
                  ) : null}

                  {merge ? (
                    <span
                      className={styles.merge}
                      style={{ left: `${dayX(merge.date)}%` }}
                      title={`${t('history.merge')}${merge.date}${t('history.mergeInto')}${
                        target?.title ?? ''
                      }`}
                    />
                  ) : null}

                  {stall.kind === 'stalled' && stall.fromDate && stall.toDate ? (
                    <>
                      <span
                        className={styles.stall}
                        style={{
                          left: `${dayX(stall.fromDate)}%`,
                          width: `${Math.max(0, dayX(stall.toDate) - dayX(stall.fromDate))}%`,
                        }}
                      />
                      <span
                        className={styles.stallDays}
                        style={{ left: `${Math.min(dayX(stall.fromDate) + 2, 88)}%` }}
                        title={`${t('history.stall.prefix')}${stall.days}${t('history.stall.suffix')}`}
                      >
                        {stall.days}
                        {t('history.stall.daysSuffix')}
                      </span>
                    </>
                  ) : null}

                  {stall.kind === 'history' && stall.fromDate && stall.toDate ? (
                    <span
                      className={styles.historyLine}
                      style={{
                        left: `${dayX(stall.fromDate)}%`,
                        width: `${Math.max(0, dayX(stall.toDate) - dayX(stall.fromDate))}%`,
                      }}
                    />
                  ) : null}

                  {stall.kind === 'dropped' && stall.fromDate && stall.toDate ? (
                    <span
                      className={styles.droppedLine}
                      style={{
                        left: `${dayX(stall.fromDate)}%`,
                        width: `${Math.max(0, dayX(stall.toDate) - dayX(stall.fromDate))}%`,
                      }}
                      title={t('history.dropped')}
                    />
                  ) : null}

                  {clusters.map((cluster) => {
                    const first = cluster.items[0]!;
                    const x = markerX(first.at);
                    if (cluster.items.length === 1) {
                      const event = first;
                      const highlighted = matchesHighlight(branch.id, event);
                      return (
                        <button
                          key={event.id}
                          type="button"
                          className={
                            event.kind === 'commit' ? styles.commitNode : styles.milestoneNode
                          }
                          style={{ left: `${x}%` }}
                          data-highlight={highlighted ? 'true' : undefined}
                          aria-label={`${event.kind === 'commit' ? t('history.node.commit') : t('history.node.milestone')}：${event.title}`}
                          title={`${event.date} · ${event.title}`}
                          onClick={() => openLaneEvent(event)}
                        />
                      );
                    }
                    return (
                      <button
                        key={cluster.id}
                        type="button"
                        className={styles.clusterNode}
                        style={{ left: `${x}%` }}
                        onClick={() => setClusterOpen({ laneId: branch.id, cluster })}
                        title={`${t('history.cluster.title')}${cluster.items.length}${t('history.cluster.countSuffix')}`}
                      >
                        {cluster.items.length}
                      </button>
                    );
                  })}

                  {groupConflictsByDate(conflicts, branch.id, rangeStart, range.end).map(
                    ([date, items]) => {
                      const markerId = `conflict:${branch.id}:${date}`;
                      return (
                        <div
                          key={markerId}
                          className={styles.badgeMarkerWrap}
                          style={{ left: `${markerX(dateToMs(date, tz))}%` }}
                        >
                          <button
                            type="button"
                            className={styles.conflictMarker}
                            aria-label={`${t('history.conflict.title')} ${date}`}
                            aria-expanded={markerOpen === markerId}
                            onMouseEnter={() => setMarkerOpen(markerId)}
                            onMouseLeave={() =>
                              setMarkerOpen((open) => (open === markerId ? null : open))
                            }
                            onClick={() =>
                              setMarkerOpen((open) => (open === markerId ? null : markerId))
                            }
                          >
                            {items.length > 1 ? items.length : ''}
                          </button>
                          {markerOpen === markerId ? (
                            <div className={styles.badgeMarkerPopover}>
                              <p className={styles.badgeMarkerTitle}>
                                {date} · {t('history.conflict.title')}
                              </p>
                              <ul className={styles.badgeMarkerList}>
                                {items.map((item) => (
                                  <li key={item.id}>
                                    {conflictEntityLabel(item.entity)} · {item.deviceLabel}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      );
                    },
                  )}

                  {badges
                    .filter((marker) => markerLane.get(marker.date) === branch.id)
                    .map((marker) => (
                      <div
                        key={marker.date}
                        className={styles.badgeMarkerWrap}
                        style={{ left: `${markerX(dateToMs(marker.date, tz))}%` }}
                      >
                        <button
                          type="button"
                          className={styles.badgeMarker}
                          aria-label={`${t('badge.marker.title')} ${marker.date}`}
                          aria-expanded={markerOpen === marker.date}
                          onMouseEnter={() => setMarkerOpen(marker.date)}
                          onMouseLeave={() =>
                            setMarkerOpen((open) => (open === marker.date ? null : open))
                          }
                          onClick={() =>
                            setMarkerOpen((open) => (open === marker.date ? null : marker.date))
                          }
                        >
                          {marker.count > 1 ? marker.count : ''}
                        </button>
                        {markerOpen === marker.date ? (
                          <div className={styles.badgeMarkerPopover}>
                            <p className={styles.badgeMarkerTitle}>
                              {marker.date} · {t('badge.marker.title')}
                            </p>
                            <ul className={styles.badgeMarkerList}>
                              {marker.catalogIds.map((catalogId) => (
                                <li key={catalogId}>{t(badgeNameKey(catalogId))}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ))}

                  {clusterOpen && clusterOpen.laneId === branch.id ? (
                    <div
                      className={styles.popover}
                      style={{ left: `${Math.min(msX(clusterOpen.cluster.items[0]!.at), 70)}%` }}
                    >
                      <p className={styles.popoverTitle}>
                        {t('history.cluster.title')}
                        {clusterOpen.cluster.items.length}
                        {t('history.cluster.countSuffix')}
                      </p>
                      <ul className={styles.popoverList}>
                        {clusterOpen.cluster.items.map((event) => (
                          <li key={event.id}>
                            <button
                              type="button"
                              className={styles.popoverItem}
                              onClick={() => {
                                openLaneEvent(event);
                                setClusterOpen(null);
                              }}
                            >
                              <span className={styles.popoverDate}>{event.date}</span>
                              <span className={styles.popoverText}>{event.title}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        className={styles.popoverClose}
                        onClick={() => setClusterOpen(null)}
                      >
                        {t('history.cluster.close')}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ul className={styles.mobileOnly}>
        {lanes.map((lane) => {
          const branch = lane.branch;
          const events = laneEvents(branch, commits, milestones, tz).filter(
            (event) => event.date >= rangeStart && event.date <= range.end,
          );
          const stall = assessStall(branch, branches, commits, {
            todayDate: range.end,
            tzOffsetMinutes: tz,
            range: { start: rangeStart },
          });
          const fork = lane.isRoot ? null : placeBranchStart(branch, range, tz);
          const merge = lane.isRoot ? null : placeBranchEnd(branch, range, tz);
          const target = branch.finishedIntoId
            ? branches.find((row) => row.id === branch.finishedIntoId)
            : undefined;

          return (
            <li
              key={branch.id}
              className={styles.mobileLane}
              data-depth={lane.depth}
              data-highlighted={highlight?.branchId === branch.id ? 'true' : undefined}
              style={laneStyle(lane)}
            >
              <div className={styles.mobileHead}>
                <span className={styles.mobileName}>{branch.title}</span>
                {lane.hasChildren ? (
                  <button
                    type="button"
                    className={styles.mobileToggle}
                    onClick={() => onToggle(branch.id)}
                  >
                    {lane.expanded ? t('history.lane.collapse') : t('history.lane.expand')}
                  </button>
                ) : null}
              </div>

              {fork ? (
                <p className={styles.mobileNote}>
                  {t('history.fork')}
                  {fork.date}
                </p>
              ) : null}

              {stall.kind === 'stalled' ? (
                <p className={styles.mobileStall}>
                  {t('history.stall.prefix')}
                  {stall.days}
                  {t('history.stall.suffix')}
                </p>
              ) : null}
              {stall.kind === 'dropped' ? (
                <p className={styles.mobileNote}>{t('history.dropped')}</p>
              ) : null}
              {stall.kind === 'archived' ? (
                <p className={styles.mobileNote}>{t('history.archived')}</p>
              ) : null}

              {badges
                .filter((marker) => markerLane.get(marker.date) === branch.id)
                .map((marker) => (
                  <div key={marker.date} className={styles.mobileMarkerRow}>
                    <button
                      type="button"
                      className={styles.mobileMarker}
                      aria-expanded={markerOpen === marker.date}
                      onClick={() =>
                        setMarkerOpen((open) => (open === marker.date ? null : marker.date))
                      }
                    >
                      {t('badge.marker.title')}
                      {marker.count > 1 ? ` ${marker.count}` : ''} · {marker.date}
                    </button>
                    {markerOpen === marker.date ? (
                      <ul className={styles.mobileMarkerList}>
                        {marker.catalogIds.map((catalogId) => (
                          <li key={catalogId}>{t(badgeNameKey(catalogId))}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}

              {groupConflictsByDate(conflicts, branch.id, rangeStart, range.end).map(
                ([date, items]) => (
                  <ul key={`conflict:${branch.id}:${date}`} className={styles.mobileConflicts}>
                    {items.map((item) => (
                      <li key={item.id} className={styles.mobileConflict}>
                        <span className={styles.mobileConflictDate}>{date}</span>
                        <span>
                          {t('history.conflict.title')} · {conflictEntityLabel(item.entity)} ·{' '}
                          {item.deviceLabel}
                        </span>
                      </li>
                    ))}
                  </ul>
                ),
              )}

              <ul className={styles.mobileEvents}>
                {events.map((event) => (
                  <li key={event.id}>
                    <button
                      type="button"
                      className={styles.mobileEvent}
                      data-highlight={matchesHighlight(branch.id, event) ? 'true' : undefined}
                      onClick={() => openLaneEvent(event)}
                    >
                      <span className={styles.mobileDate}>{event.date}</span>
                      <span className={styles.mobileText}>{event.title}</span>
                      <span className={styles.mobileKind}>
                        {event.kind === 'commit'
                          ? t('history.node.commit')
                          : t('history.node.milestone')}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              {merge ? (
                <p className={styles.mobileNote}>
                  {t('history.merge')}
                  {merge.date}
                  {target ? `${t('history.mergeInto')}${target.title}` : ''}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
