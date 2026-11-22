import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { currentTzOffset, systemClock, today, toLocalDate } from '@/core/clock';
import type { Branch, Commit, Milestone } from '@/data/types';
import { t } from '@/i18n';
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
/** 节点最大半宽（当天徽章 20px）；用于让区间首尾的节点不被面板边缘裁掉。 */
const EDGE_PAD_PX = 10;
const DAY_MS = 86_400_000;

export interface TimelineHighlight {
  branchId: string;
  date: string;
  commitId: string | null;
  milestoneId: string | null;
}

interface TimelineChartProps {
  branches: readonly Branch[];
  commits: readonly Commit[];
  milestones: readonly Milestone[];
  badges: readonly BadgeMarker[];
  range: TimeRange;
  /** `null` 表示不筛选；否则只显示集合内的分支。 */
  visibleIds: Set<string> | null;
  expanded: Record<string, boolean>;
  onToggle: (branchId: string) => void;
  highlight: TimelineHighlight | null;
  canLoadEarlier: boolean;
  onLoadEarlier: () => void;
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

function xPercent(ms: number, startMs: number, totalMs: number): number {
  const value = ((ms - startMs) / totalMs) * 100;
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function monthTicks(
  start: string,
  end: string,
  suffix: string,
  yearSuffix: string,
): Array<{ date: string; label: string }> {
  const ticks = [{ date: start, label: start.slice(5) }];
  const startYear = Number(start.slice(0, 4));
  const startMonth = Number(start.slice(5, 7));
  const endYear = Number(end.slice(0, 4));
  const endMonth = Number(end.slice(5, 7));

  let year = startYear;
  let month = startMonth + 1;
  while (year < endYear || (year === endYear && month <= endMonth)) {
    const date = `${year}-${pad2(month)}-01`;
    if (date > start && date <= end) {
      // 跨年范围内一月只写年份，避免只看到「1 月」分不清是哪一年。
      ticks.push({ date, label: month === 1 ? `${year}${yearSuffix}` : `${month}${suffix}` });
    }
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return ticks;
}

function isValidCommit(commit: Commit): boolean {
  return commit.voidedAt === null && commit.deletedAt === null;
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
  range,
  visibleIds,
  expanded,
  onToggle,
  highlight,
  canLoadEarlier,
  onLoadEarlier,
  onOpenCommit,
  onOpenMilestone,
}: TimelineChartProps) {
  const tz = currentTzOffset(systemClock.now());
  const scrollRef = useRef<HTMLDivElement>(null);
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
  const totalMs = totalDays * DAY_MS;
  const startMs = dateToMs(rangeStart, tz, 0);
  const trackWidth = Math.max(viewportWidth - LABEL_WIDTH_PX, totalDays * MIN_DAY_WIDTH_PX);
  const pxPerMs = trackWidth / totalMs;
  const todayDate = today(systemClock, tz);
  const todayX = Math.min(
    Math.max(EDGE_PAD_PX, (dateToMs(todayDate, tz, 0) - startMs) * pxPerMs),
    Math.max(EDGE_PAD_PX, trackWidth - EDGE_PAD_PX),
  );
  const tickClass = (date: string): string =>
    date === range.end ? styles.tickEnd : date === rangeStart ? styles.tickStart : styles.tick;
  const monthSuffix = t('history.axis.monthSuffix');
  const yearSuffix = t('history.axis.yearSuffix');
  const ticks = useMemo(
    () => monthTicks(rangeStart, range.end, monthSuffix, yearSuffix),
    [rangeStart, range.end, monthSuffix, yearSuffix],
  );

  const dayX = (date: string): number => xPercent(dateToMs(date, tz), startMs, totalMs);
  const msX = (ms: number): number => xPercent(ms, startMs, totalMs);
  // 首尾当天的节点会被 100% / 0% 定位切掉一半，向内收一个节点半径。
  const markerX = (ms: number): number => {
    const pad = trackWidth > 0 ? (EDGE_PAD_PX / trackWidth) * 100 : 0;
    return Math.min(100 - pad, Math.max(pad, msX(ms)));
  };

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
    if (!element || !canLoadEarlier) return;
    if (element.scrollLeft <= 8) onLoadEarlier();
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
      {canLoadEarlier ? (
        <button type="button" className={styles.loadEarlier} onClick={onLoadEarlier}>
          {t('history.loadEarlier')}
        </button>
      ) : null}

      <div className={styles.desktopOnly} ref={scrollRef} onScroll={handleScroll}>
        <div className={styles.canvas} style={{ width: LABEL_WIDTH_PX + trackWidth }}>
          <div className={styles.axisRow}>
            <div className={styles.axisCorner} />
            <div className={styles.axisTrack} style={{ width: trackWidth }}>
              {ticks.map((tick) => (
                <span
                  key={tick.date}
                  className={tickClass(tick.date)}
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

            return (
              <div
                className={styles.laneRow}
                key={branch.id}
                data-depth={lane.depth}
                data-highlighted={laneHighlighted ? 'true' : undefined}
                style={laneStyle(lane)}
              >
                <div className={styles.laneLabel}>
                  <button
                    type="button"
                    className={styles.laneToggle}
                    aria-label={
                      lane.expanded ? t('history.lane.collapse') : t('history.lane.expand')
                    }
                    aria-expanded={lane.hasChildren ? lane.expanded : undefined}
                    disabled={!lane.hasChildren}
                    onClick={() => onToggle(branch.id)}
                  >
                    {lane.hasChildren ? (lane.expanded ? '−' : '+') : '·'}
                  </button>
                  <span className={styles.laneName} title={branch.title}>
                    {branch.title}
                  </span>
                  <span className={styles.laneStatus}>
                    {branch.archivedAt !== null
                      ? t('history.archived')
                      : branch.droppedAt !== null
                        ? t('history.dropped')
                        : null}
                  </span>
                </div>

                <div className={styles.track} style={{ width: trackWidth }}>
                  <span
                    className={styles.rail}
                    style={{
                      left: `${lane.isRoot ? 0 : dayX(toLocalDate(branch.createdAt, tz))}%`,
                    }}
                  />

                  {ticks.map((tick) => (
                    <span
                      key={tick.date}
                      className={styles.guide}
                      style={{ left: `${dayX(tick.date)}%` }}
                    />
                  ))}

                  {fork ? (
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
                          width: `${dayX(stall.toDate) - dayX(stall.fromDate)}%`,
                        }}
                      />
                      <span className={styles.stallDays} style={{ left: `${dayX(stall.toDate)}%` }}>
                        {t('history.stall.prefix')}
                        {stall.days}
                        {t('history.stall.suffix')}
                      </span>
                    </>
                  ) : null}

                  {stall.kind === 'history' && stall.fromDate && stall.toDate ? (
                    <span
                      className={styles.historyLine}
                      style={{
                        left: `${dayX(stall.fromDate)}%`,
                        width: `${dayX(stall.toDate) - dayX(stall.fromDate)}%`,
                      }}
                    />
                  ) : null}

                  {stall.kind === 'dropped' && stall.fromDate && stall.toDate ? (
                    <span
                      className={styles.droppedLine}
                      style={{
                        left: `${dayX(stall.fromDate)}%`,
                        width: `${dayX(stall.toDate) - dayX(stall.fromDate)}%`,
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
