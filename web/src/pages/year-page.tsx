import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { currentTzOffset, systemClock, today, toLocalDate } from '@/core/clock';
import type { YearBranchShare, YearMonthBucket } from '@/core/rules/year-distribution';
import { createLevelOneResolver, isYearCommit } from '@/core/rules/year-metrics';
import { listSelectableYears, resolveYearParam } from '@/core/rules/year-param';
import { useYearReviewData } from '@/data/hooks';
import { trackOpsEvent } from '@/data/ops-events';
import { saveYearReview } from '@/data/save-year-review';
import { t } from '@/i18n';
import { useHistoryFilterStore } from '@/stores/history.store';
import { SvgIcon } from '@/ui/icons/svg-icon';
import { PageShell } from '@/ui/page-shell';
import { YearSharePreview } from '@/components/year/year-share-preview';
import styles from './year-page.module.css';

const FOUR_DIGITS = /^\d{4}$/;
const TOP_BRANCHES = 3;

const PENCIL_ICON = (
  <SvgIcon size={16}>
    <path d="m5 16-.6 3.6L8 19l10-10-3-3L5 16Zm8-8 3 3" />
  </SvgIcon>
);

const SHARE_ICON = (
  <SvgIcon size={16}>
    <path d="m8.5 12 7-4.5m-7 4.5 7 4.5" />
    <circle cx="6" cy="12" r="2.1" />
    <circle cx="18" cy="6" r="2.1" />
    <circle cx="18" cy="18" r="2.1" />
  </SvgIcon>
);

const PREV_ICON = (
  <SvgIcon size={16}>
    <path d="m14 6-6 6 6 6" />
  </SvgIcon>
);

const NEXT_ICON = (
  <SvgIcon size={16}>
    <path d="m10 6 6 6-6 6" />
  </SvgIcon>
);

interface MonthSegment {
  key: string | null;
  count: number;
  color: string | null;
}

function shareStyle(share: YearBranchShare): CSSProperties | undefined {
  if (share.branchId === null || share.color === null) return undefined;
  return { '--share-color': `var(--${share.color}-1)` } as CSSProperties;
}

function shareTitle(share: YearBranchShare): string {
  return share.title || t('year.branches.mine');
}

function ShareRow({ share, to }: { share: YearBranchShare; to: string | null }) {
  const body = (
    <>
      <span className={styles.branchDot} style={shareStyle(share)} aria-hidden="true" />
      <span className={styles.branchMain}>
        <span className={styles.branchTitle}>{shareTitle(share)}</span>
        <span className={styles.branchMeta}>
          <span>
            {share.commits}
            {t('year.branches.commitsSuffix')}
          </span>
          <span>
            {Math.round(share.ratio * 100)}
            {t('year.branches.ratioSuffix')}
          </span>
          <span>
            {share.taskTotal === 0
              ? t('year.branches.progressEmpty')
              : `${t('year.branches.progressPrefix')}${share.taskDone}/${share.taskTotal}`}
          </span>
          {share.archived ? (
            <span className={styles.branchTag}>{t('year.branches.archived')}</span>
          ) : null}
        </span>
      </span>
    </>
  );

  if (to === null) return <div className={styles.branchRow}>{body}</div>;
  return (
    <Link className={styles.branchRow} to={to}>
      {body}
    </Link>
  );
}

function MonthBar({
  bucket,
  segments,
  count,
  future,
  yMax,
  current,
  onOpen,
}: {
  bucket: YearMonthBucket;
  segments: MonthSegment[];
  count: number | null;
  future: boolean;
  yMax: number;
  current: boolean;
  onOpen: () => void;
}) {
  const monthLabel = `${t('year.month.jump')}${bucket.month}${t('history.axis.monthSuffix')}`;
  const label =
    count === null
      ? future
        ? `${monthLabel} ${t('year.month.future')}`
        : monthLabel
      : `${monthLabel} ${count}${t('year.month.countSuffix')}`;

  return (
    <button
      type="button"
      className={`${current ? styles.monthCurrent : styles.month}${future ? ` ${styles.monthFuture}` : ''}`}
      onClick={onOpen}
      aria-label={label}
    >
      <span className={styles.monthPlot} aria-hidden="true">
        {count === null ? (
          <span className={styles.monthDash}>—</span>
        ) : count === 0 ? null : (
          <span
            className={styles.monthBar}
            style={{ height: `${Math.round((count / yMax) * 100)}%` }}
          >
            {current ? <span className={styles.monthNumber}>{count}</span> : null}
            {segments.map((segment) => (
              <span
                key={segment.key ?? 'other'}
                className={styles.monthSegment}
                style={
                  {
                    '--seg-color': segment.color ? `var(--${segment.color}-1)` : 'var(--neutral)',
                    flexGrow: segment.count,
                  } as CSSProperties
                }
              />
            ))}
          </span>
        )}
      </span>
      <span className={styles.monthLabel}>{String(bucket.month).padStart(2, '0')}</span>
    </button>
  );
}

function YearSkeleton({ label }: { label: string | null }) {
  return (
    <div
      className={styles.skeleton}
      role={label ? 'status' : undefined}
      aria-live={label ? 'polite' : undefined}
      aria-hidden={label ? undefined : true}
    >
      {label ? <span className={styles.skeletonLabel}>{label}</span> : null}
      <div className={styles.metrics}>
        {[0, 1, 2, 3].map((index) => (
          <span key={index} className={styles.metricSkeleton} />
        ))}
      </div>
      <span className={styles.chartSkeleton} />
      <span className={styles.sectionSkeleton} />
    </div>
  );
}

/**
 * P05 年轮（V1-02）。
 *
 * 年份来自 URL，非法或越界回落到当前年；四项指标、月度分布与分支占比全部现算。
 * 只有年度总结可写，写入 `year_reviews`，失败时保留编辑态。
 */
export function YearPage() {
  const { year } = useParams<{ year: string }>();
  const navigate = useNavigate();
  const setRange = useHistoryFilterStore((state) => state.setRange);

  const todayDate = today(systemClock);
  const currentYear = Number(todayDate.slice(0, 4));
  const shapedYear = year !== undefined && FOUR_DIGITS.test(year);
  const requestedYear = shapedYear ? Number(year) : currentYear;

  const view = useYearReviewData(requestedYear, todayDate);
  const bounds = { earliestYear: view.earliestYear, currentYear };
  const years = listSelectableYears(bounds);
  const parsed = resolveYearParam(year, bounds);
  const shouldCorrect =
    parsed.corrected && (view.status === 'ready' || !shapedYear || requestedYear > currentYear);

  useEffect(() => {
    if (!shouldCorrect) return;
    navigate(`/history/${parsed.normalized}`, { replace: true });
  }, [shouldCorrect, parsed.normalized, navigate]);

  const [editing, setEditing] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [committed, setCommitted] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [savedHint, setSavedHint] = useState(false);
  const savingRef = useRef(false);
  const yearRef = useRef(requestedYear);
  const reported = useRef(false);

  // 进入年轮页即视为打开一次年度回顾；切换年份与重渲染不重复上报。
  useEffect(() => {
    if (reported.current) return;
    reported.current = true;
    trackOpsEvent('review.open', { kind: 'year' });
  }, []);

  useEffect(() => {
    yearRef.current = requestedYear;
  }, [requestedYear]);

  useEffect(() => {
    setEditing(false);
    setShareOpen(false);
    setDraft('');
    setCommitted(null);
    setSaveError(false);
    setSavedHint(false);
  }, [requestedYear]);

  useEffect(() => {
    if (!savedHint) return;
    const timer = window.setTimeout(() => setSavedHint(false), 2000);
    return () => window.clearTimeout(timer);
  }, [savedHint]);

  const note = committed ?? view.note;

  const startEdit = (): void => {
    setDraft(note);
    setEditing(true);
    setSaveError(false);
  };

  const handleSave = async (): Promise<void> => {
    if (savingRef.current || !editing) return;
    if (draft.trim() === note.trim()) {
      setEditing(false);
      return;
    }
    const yearAtSave = requestedYear;
    savingRef.current = true;
    setSaving(true);
    setSaveError(false);
    const result = await saveYearReview({ year: yearAtSave, note: draft });
    savingRef.current = false;
    setSaving(false);
    if (yearRef.current !== yearAtSave) return;
    if (!result.ok) {
      setSaveError(true);
      return;
    }
    setCommitted(result.value.note);
    setDraft(result.value.note);
    setEditing(false);
    setSavedHint(true);
  };

  const switchYear = (next: number): void => {
    if (next === requestedYear) return;
    yearRef.current = next;
    setEditing(false);
    setDraft('');
    setCommitted(null);
    setSaveError(false);
    setSavedHint(false);
    navigate(`/history/${next}`);
  };

  const openMonth = (): void => {
    setRange('all');
    navigate('/history');
  };

  const root = view.branches.find(
    (branch) => branch.parentId === null && branch.deletedAt === null,
  );
  const rootId = root?.id ?? null;
  const distribution = view.distribution;
  const metrics = view.metrics;

  const emptyYear = distribution.total === 0;
  const counts = distribution.months.map((bucket) => bucket.count);
  const max = Math.max(1, ...counts.map((count) => count ?? 0));
  const yMax = Math.max(4, Math.ceil(max / 4) * 4);
  const yTicks = [yMax, (yMax * 3) / 4, yMax / 2, yMax / 4, 0];
  const currentMonth = requestedYear === currentYear ? Number(todayDate.slice(5, 7)) : null;
  const todayDay = Number(todayDate.slice(8, 10));
  const yearIndex = years.indexOf(requestedYear);
  const prevYear = yearIndex > 0 ? years[yearIndex - 1] : null;
  const nextYear = yearIndex >= 0 && yearIndex < years.length - 1 ? years[yearIndex + 1] : null;

  const todayMonth = Number(todayDate.slice(5, 7));
  const tzOffset = currentTzOffset(systemClock.now());
  const commitMeta =
    requestedYear === currentYear
      ? `${t('year.metric.untilPrefix')}${todayMonth}${t('year.metric.monthSuffix')}${todayDay}${t('year.metric.daySuffix')}`
      : t('year.metric.fullYear');
  const activeNames = distribution.shares
    .filter((share) => share.branchId !== null)
    .map(shareTitle);
  const branchMeta =
    activeNames.length === 0
      ? t('year.metric.branchesEmpty')
      : activeNames.join(t('year.metric.listSeparator'));
  let finishedMeta = t('year.metric.finishedEmpty');
  const mergedThisYear = view.branches
    .filter(
      (branch) =>
        branch.status === 'merged' &&
        branch.finishedAt !== null &&
        Number(toLocalDate(branch.finishedAt, tzOffset).slice(0, 4)) === requestedYear,
    )
    .sort((left, right) => (right.finishedAt ?? 0) - (left.finishedAt ?? 0));
  const finishedBranch = mergedThisYear[0];
  if (finishedBranch !== undefined && finishedBranch.finishedAt !== null) {
    const finishedDate = toLocalDate(finishedBranch.finishedAt, tzOffset);
    finishedMeta = `${finishedBranch.title}${t('year.metric.finishedSeparator')}${Number(
      finishedDate.slice(5, 7),
    )}${t('year.metric.monthSuffix')}${Number(finishedDate.slice(8, 10))}${t(
      'year.metric.daySuffix',
    )}`;
  }

  const legendBranches = useMemo(
    () =>
      distribution.shares
        .filter((share) => share.branchId !== null && share.color !== null)
        .slice(0, TOP_BRANCHES),
    [distribution.shares],
  );

  const monthlySegments = useMemo(() => {
    const resolveLevelOne = createLevelOneResolver(view.branches);
    const known = new Map(
      legendBranches.map((share) => [share.branchId as string, share.color as string]),
    );
    const rows: Array<Map<string | null, number>> = Array.from(
      { length: 12 },
      () => new Map<string | null, number>(),
    );
    for (const commit of view.commits) {
      if (!isYearCommit(commit, requestedYear)) continue;
      const month = Number(commit.date.slice(5, 7));
      if (!Number.isInteger(month) || month < 1 || month > 12) continue;
      const levelOneId = resolveLevelOne(commit.branchId);
      const key = levelOneId !== null && known.has(levelOneId) ? levelOneId : null;
      const bucketMap = rows[month - 1];
      bucketMap.set(key, (bucketMap.get(key) ?? 0) + 1);
    }
    const order: Array<string | null> = [...legendBranches.map((share) => share.branchId), null];
    return rows.map((bucketMap) =>
      order
        .map((key) => ({
          key,
          count: bucketMap.get(key) ?? 0,
          color: key !== null ? (known.get(key) ?? null) : null,
        }))
        .filter((segment) => segment.count > 0),
    );
  }, [view.commits, view.branches, requestedYear, legendBranches]);

  const hasOtherCommits = monthlySegments.some((segments) =>
    segments.some((segment) => segment.key === null && segment.count > 0),
  );

  return (
    <PageShell
      title={
        <div className={styles.headingWrap}>
          <nav className={styles.crumb}>
            <Link to="/history">{t('year.crumb.history')}</Link>
            <span aria-hidden="true">/</span>
            <span>{t('year.crumb.review')}</span>
          </nav>
          <h1 className={styles.heading}>
            {requestedYear}
            <span>{t('year.headingRing')}</span>
          </h1>
        </div>
      }
      bodyKey="page.year.body"
      action={
        <div className={styles.picker} role="group" aria-label={t('year.switch.label')}>
          <button
            type="button"
            className={styles.pickerButton}
            aria-label={t('year.switch.prev')}
            disabled={prevYear === null}
            onClick={() => {
              if (prevYear !== null) switchYear(prevYear);
            }}
          >
            {PREV_ICON}
          </button>
          <span className={styles.pickerYear}>
            {requestedYear}
            {t('year.headingSuffix')}
          </span>
          <button
            type="button"
            className={styles.pickerButton}
            aria-label={t('year.switch.next')}
            disabled={nextYear === null}
            onClick={() => {
              if (nextYear !== null) switchYear(nextYear);
            }}
          >
            {NEXT_ICON}
          </button>
        </div>
      }
    >
      <div className={styles.content}>
        {view.status === 'error' ? (
          <div className={styles.errorBanner} role="alert">
            <span>{t('year.loadFailed')}</span>
            <button type="button" className={styles.retry} onClick={view.retry}>
              {t('year.retry')}
            </button>
          </div>
        ) : null}

        {view.status === 'loading' ? (
          <YearSkeleton label={t('year.loading')} />
        ) : view.status === 'error' ? (
          <YearSkeleton label={null} />
        ) : (
          <>
            <div className={styles.metrics}>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>{t('year.metric.commitsLabel')}</span>
                <strong className={styles.metricValue}>{metrics.commits}</strong>
                <small className={styles.metricMeta}>{commitMeta}</small>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>{t('year.metric.branches')}</span>
                <strong className={styles.metricValue}>{metrics.activeLevelOneBranches}</strong>
                <small className={styles.metricMeta}>{branchMeta}</small>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>{t('year.metric.openedLabel')}</span>
                <strong className={styles.metricValue}>{metrics.opened}</strong>
                <small className={styles.metricMeta}>{t('year.metric.openedMeta')}</small>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>{t('year.metric.finishedLabel')}</span>
                <strong className={styles.metricValue}>{metrics.finished}</strong>
                <small className={styles.metricMeta}>{finishedMeta}</small>
              </div>
            </div>

            {emptyYear ? (
              <div className={styles.emptyBanner}>
                <span>{t('year.empty')}</span>
                <Link className={styles.emptyAction} to="/today">
                  {t('year.empty.action')}
                </Link>
              </div>
            ) : null}

            <section className={styles.panel}>
              <div className={styles.panelHead}>
                <div className={styles.panelHeading}>
                  <h2>{t('year.months.title')}</h2>
                  <p>{t('year.months.subtitle')}</p>
                </div>
                {legendBranches.length > 0 || hasOtherCommits ? (
                  <div className={styles.legend} aria-label={t('year.chart.legend')}>
                    {legendBranches.map((share) => (
                      <span key={share.branchId}>
                        <i
                          className={styles.legendDot}
                          style={shareStyle(share)}
                          aria-hidden="true"
                        />
                        {shareTitle(share)}
                      </span>
                    ))}
                    {hasOtherCommits ? (
                      <span>
                        <i
                          className={styles.legendDot}
                          style={{ '--share-color': 'var(--neutral)' } as CSSProperties}
                          aria-hidden="true"
                        />
                        {t('year.chart.other')}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className={styles.chart}>
                <div className={styles.chartAxis} aria-hidden="true">
                  {yTicks.map((tick) => (
                    <span key={tick}>{tick}</span>
                  ))}
                </div>
                <div className={styles.chartPlot}>
                  <div className={styles.chartGrid} aria-hidden="true">
                    {[0, 1, 2, 3, 4].map((index) => (
                      <span key={index} />
                    ))}
                  </div>
                  <div className={styles.months}>
                    {distribution.months.map((bucket, index) => (
                      <MonthBar
                        key={bucket.month}
                        bucket={bucket}
                        segments={monthlySegments[index]}
                        count={counts[index] ?? null}
                        future={bucket.count === null}
                        yMax={yMax}
                        current={currentMonth === bucket.month}
                        onOpen={openMonth}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {currentMonth !== null ? (
                <div className={styles.chartFoot}>
                  <span className={styles.chartFootItem}>
                    <i aria-hidden="true" />
                    {currentMonth}
                    {t('year.chart.until')}
                    {todayDay}
                    {t('year.chart.daySuffix')}
                  </span>
                  <span className={styles.chartFootItem}>12{t('year.chart.future')}</span>
                </div>
              ) : null}
            </section>

            <div className={styles.bottom}>
              <section className={styles.panel}>
                <div className={styles.panelHead}>
                  <div className={styles.panelHeading}>
                    <h2>{t('year.branches.title')}</h2>
                    <p>{t('year.distribution.subtitle')}</p>
                  </div>
                  <span className={styles.distColumns} aria-hidden="true">
                    <span>{t('year.metric.commits')}</span>
                    <span>{t('year.distribution.ratio')}</span>
                  </span>
                </div>
                {distribution.shares.length === 0 ? (
                  <p className={styles.quiet}>{t('year.empty')}</p>
                ) : (
                  <div className={styles.branchList}>
                    {distribution.shares.map((share) => (
                      <ShareRow
                        key={share.branchId ?? 'root'}
                        share={share}
                        to={
                          share.branchId !== null
                            ? `/branches/${share.branchId}`
                            : rootId
                              ? `/branches/${rootId}`
                              : null
                        }
                      />
                    ))}
                  </div>
                )}
              </section>

              <section className={styles.panel}>
                <div className={styles.panelHead}>
                  <div className={styles.panelHeading}>
                    <h2>{t('year.summary.title')}</h2>
                    <p>{t('year.summary.subtitle')}</p>
                  </div>
                  <button
                    type="button"
                    className={styles.iconButton}
                    aria-label={t('year.summary.edit')}
                    disabled={saving}
                    onClick={startEdit}
                  >
                    {PENCIL_ICON}
                  </button>
                </div>

                <div className={styles.summaryBody}>
                  {editing ? (
                    <div className={styles.editor}>
                      <label className={styles.srOnly} htmlFor="year-summary">
                        {t('year.summary.label')}
                      </label>
                      <textarea
                        id="year-summary"
                        className={styles.summaryInput}
                        rows={2}
                        value={draft}
                        disabled={saving}
                        onChange={(event) => setDraft(event.target.value)}
                        onBlur={() => void handleSave()}
                      />
                      <div className={styles.editorActions}>
                        <button
                          type="button"
                          className={styles.save}
                          disabled={saving}
                          onClick={() => void handleSave()}
                        >
                          {saving ? t('year.summary.saving') : t('year.summary.save')}
                        </button>
                        {saveError ? (
                          <span className={styles.saveError} role="alert">
                            {t('year.summary.error')}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ) : note.trim() === '' ? (
                    <button type="button" className={styles.noteEmpty} onClick={startEdit}>
                      {t('year.summary.placeholder')}
                    </button>
                  ) : (
                    <button type="button" className={styles.note} onClick={startEdit}>
                      {note}
                    </button>
                  )}
                  {savedHint ? (
                    <span className={styles.savedHint} role="status">
                      {t('year.summary.saved')}
                    </span>
                  ) : null}

                  <div className={styles.shareCard}>
                    <div className={styles.shareCardBody}>
                      <strong className={styles.shareTitle}>{t('year.share.cardTitle')}</strong>
                      <p className={styles.shareBody}>{t('year.share.cardBody')}</p>
                      {view.status === 'ready' && !view.share.available ? (
                        <p className={styles.shareHint}>{t('year.share.emptyHint')}</p>
                      ) : null}
                      <button
                        type="button"
                        className={styles.shareButton}
                        disabled={view.status !== 'ready' || !view.share.available}
                        title={
                          view.status === 'ready' && !view.share.available
                            ? t('year.share.emptyHint')
                            : t('year.share.title')
                        }
                        onClick={() => setShareOpen(true)}
                      >
                        {SHARE_ICON}
                        {t('year.share.generate')}
                      </button>
                    </div>
                    <svg
                      role="img"
                      aria-label={t('year.share.graphicAlt')}
                      viewBox="0 0 144 180"
                      fill="none"
                      className={styles.shareGraphic}
                    >
                      <defs>
                        <pattern
                          id="year-share-grid"
                          width="16"
                          height="16"
                          patternUnits="userSpaceOnUse"
                        >
                          <path d="M16 0H0V16" className={styles.shareGrid} />
                        </pattern>
                      </defs>
                      <rect
                        x="1"
                        y="1"
                        width="142"
                        height="178"
                        rx="10"
                        className={styles.sharePaper}
                      />
                      <g transform="translate(1 17) scale(.85 1.16)">
                        <path d="M18 42h132v66H18z" fill="url(#year-share-grid)" />
                        <text x="16" y="25" className={styles.shareTypography}>
                          {requestedYear} {t('year.headingRing')}
                        </text>
                        <g strokeWidth="1.6" strokeLinecap="round">
                          <path
                            className={styles.shareCoral}
                            d="M18 58h132m-107 0 13-10h26l13 10"
                          />
                          <path className={styles.shareSky} d="M18 76h132m-79 0 12 9h25" />
                          <path className={styles.shareHoney} d="M18 96h96" />
                        </g>
                        <g strokeWidth="0">
                          <circle cx="28" cy="58" r="3.2" className={styles.shareCoralFill} />
                          <circle cx="69" cy="48" r="3.2" className={styles.shareCoralFill} />
                          <circle cx="95" cy="58" r="3.2" className={styles.shareCoralFill} />
                          <circle cx="142" cy="58" r="3.2" className={styles.shareCoralFill} />
                          <circle cx="39" cy="76" r="3.2" className={styles.shareSkyFill} />
                          <circle cx="71" cy="76" r="3.2" className={styles.shareSkyFill} />
                          <circle cx="108" cy="85" r="3.2" className={styles.shareSkyFill} />
                          <circle cx="59" cy="96" r="3.2" className={styles.shareHoneyFill} />
                          <circle cx="98" cy="96" r="3.2" className={styles.shareHoneyFill} />
                        </g>
                        <text x="16" y="124" className={styles.shareFoot}>
                          {t('app.name')}
                        </text>
                        <text x="150" y="124" textAnchor="end" className={styles.shareFoot}>
                          {metrics.commits}
                          {t('year.share.commitsSuffix')}
                        </text>
                      </g>
                    </svg>
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </div>

      {shareOpen && view.status === 'ready' ? (
        <YearSharePreview model={view.share} onClose={() => setShareOpen(false)} />
      ) : null}
    </PageShell>
  );
}
