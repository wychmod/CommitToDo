import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { systemClock, today } from '@/core/clock';
import type { YearBranchShare, YearMonthBucket } from '@/core/rules/year-distribution';
import { listSelectableYears, resolveYearParam } from '@/core/rules/year-param';
import { useYearReviewData } from '@/data/hooks';
import { saveYearReview } from '@/data/save-year-review';
import { t } from '@/i18n';
import { useHistoryFilterStore } from '@/stores/history.store';
import { PageShell } from '@/ui/page-shell';
import { YearSharePreview } from '@/components/year/year-share-preview';
import styles from './year-page.module.css';

const FOUR_DIGITS = /^\d{4}$/;

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
  count,
  future,
  max,
  onOpen,
}: {
  bucket: YearMonthBucket;
  count: number | null;
  future: boolean;
  max: number;
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
    <button type="button" className={styles.month} onClick={onOpen} aria-label={label}>
      <span className={styles.monthPlot} aria-hidden="true">
        {count === null ? (
          <span className={styles.monthEmpty} />
        ) : count === 0 ? (
          <span className={styles.monthZero} />
        ) : (
          <span
            className={styles.monthBar}
            style={{ height: `${Math.round((count / max) * 100)}%` }}
          />
        )}
      </span>
      <span className={styles.monthLabel}>{bucket.month}</span>
      <span className={styles.monthCount}>
        {count === null ? (future ? t('year.month.future') : null) : count}
      </span>
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
  const counts = distribution.months.map((bucket) => (emptyYear ? null : bucket.count));
  const max = Math.max(1, ...counts.map((count) => count ?? 0));

  return (
    <PageShell
      title={
        <h1>
          {requestedYear}
          {t('year.headingSuffix')}
        </h1>
      }
      bodyKey="page.year.body"
      action={
        <button
          type="button"
          className={styles.share}
          disabled={view.status !== 'ready' || !view.share.available}
          title={
            view.status === 'ready' && !view.share.available
              ? t('year.share.emptyHint')
              : t('year.share.title')
          }
          onClick={() => setShareOpen(true)}
        >
          {t('year.share')}
        </button>
      }
    >
      <div className={styles.content}>
        <div className={styles.yearBar} role="group" aria-label={t('year.switch.label')}>
          {years.map((value) => (
            <button
              key={value}
              type="button"
              className={value === requestedYear ? styles.yearChipActive : styles.yearChip}
              aria-current={value === requestedYear ? 'true' : undefined}
              onClick={() => switchYear(value)}
            >
              {value}
              {t('year.headingSuffix')}
            </button>
          ))}
        </div>

        {view.status === 'ready' && !view.share.available ? (
          <p className={styles.shareReason}>{t('year.share.emptyHint')}</p>
        ) : null}

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
                <span className={styles.metricValue}>{metrics.commits}</span>
                <span className={styles.metricLabel}>{t('year.metric.commits')}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricValue}>{metrics.activeLevelOneBranches}</span>
                <span className={styles.metricLabel}>{t('year.metric.branches')}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricValue}>{metrics.opened}</span>
                <span className={styles.metricLabel}>{t('year.metric.opened')}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricValue}>{metrics.finished}</span>
                <span className={styles.metricLabel}>{t('year.metric.finished')}</span>
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

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{t('year.months.title')}</h2>
              <div className={styles.monthsScroll}>
                <div className={styles.months}>
                  {distribution.months.map((bucket, index) => (
                    <MonthBar
                      key={bucket.month}
                      bucket={bucket}
                      count={counts[index] ?? null}
                      future={!emptyYear && bucket.count === null}
                      max={max}
                      onOpen={openMonth}
                    />
                  ))}
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{t('year.branches.title')}</h2>
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
              {distribution.top.length > 0 ? (
                <>
                  <h2 className={styles.sectionTitle}>{t('year.top.title')}</h2>
                  <div className={styles.branchList}>
                    {distribution.top.map((share) => (
                      <ShareRow
                        key={share.branchId}
                        share={share}
                        to={`/branches/${share.branchId}`}
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{t('year.summary.title')}</h2>
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
                <button type="button" className={styles.summaryEmpty} onClick={startEdit}>
                  {t('year.summary.placeholder')}
                </button>
              ) : (
                <button type="button" className={styles.summaryText} onClick={startEdit}>
                  {note}
                </button>
              )}
              {savedHint ? (
                <span className={styles.savedHint} role="status">
                  {t('year.summary.saved')}
                </span>
              ) : null}
            </section>
          </>
        )}
      </div>

      {shareOpen && view.status === 'ready' ? (
        <YearSharePreview model={view.share} onClose={() => setShareOpen(false)} />
      ) : null}
    </PageShell>
  );
}
