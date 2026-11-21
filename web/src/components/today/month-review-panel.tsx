import { useEffect, useState } from 'react';
import { systemClock, today } from '@/core/clock';
import { shiftMonthKey, type MonthReview } from '@/core/rules/month-review';
import { useMonthReview } from '@/data/hooks';
import { t } from '@/i18n';
import { useReviewStore } from '@/stores/review.store';
import styles from './month-review-panel.module.css';

const SECTION_TITLES = [
  'monthReview.total.title',
  'monthReview.shares.title',
  'monthReview.structure.title',
  'monthReview.stall.title',
  'monthReview.observation.title',
] as const;

function observationText(review: MonthReview): string {
  const observation = review.observation;
  const share =
    'branchId' in observation
      ? review.shares.find((row) => row.branchId === observation.branchId)
      : undefined;
  const branchName =
    share?.branchId === null ? t('year.branches.mine') : share?.title || share?.branchId || '';

  switch (observation.type) {
    case 'empty':
      return t('monthReview.observation.empty');
    case 'concentrated':
      return `${t('monthReview.observation.concentratedPrefix')}${branchName}${t('monthReview.observation.concentratedMiddle')}${Math.round(observation.ratio * 100)}${t('monthReview.observation.percentSuffix')}`;
    case 'balanced':
      return `${t('monthReview.observation.balancedPrefix')}${Math.round(observation.ratio * 100)}${t('monthReview.observation.percentSuffix')}`;
    case 'continuity':
      return `${t('monthReview.observation.continuityPrefix')}${branchName}${t('monthReview.observation.continuityMiddle')}${observation.weeks}${t('monthReview.observation.continuitySuffix')}`;
    case 'structure':
      return `${t(observation.kind === 'opened' ? 'monthReview.observation.openedPrefix' : 'monthReview.observation.finishedPrefix')}${observation.count}${t('monthReview.structure.countSuffix')}`;
    case 'structureNone':
      return t('monthReview.observation.structureNone');
  }
}

/** S01-month-review：固定五区块，只读；窄屏全屏并可返回今天页。 */
export function MonthReviewPanel() {
  const closeMonth = useReviewStore((state) => state.closeMonth);
  const defaultMonth = shiftMonthKey(today(systemClock).slice(0, 7), -1);
  const [monthKey, setMonthKey] = useState(defaultMonth);
  const view = useMonthReview(monthKey);
  const review = view.review;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') closeMonth();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeMonth]);

  return (
    <div className={styles.backdrop} role="presentation" onPointerDown={closeMonth}>
      <section
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={t('monthReview.title')}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>{t('monthReview.title')}</h2>
            <p className={styles.month}>
              {monthKey.slice(0, 4)}
              {t('year.headingSuffix')}
              {Number(monthKey.slice(5))}
              {t('history.axis.monthSuffix')}
            </p>
          </div>
          <button type="button" className={styles.close} onClick={closeMonth} autoFocus>
            {t('monthReview.close')}
          </button>
        </header>

        <div className={styles.navigation} role="group" aria-label={t('monthReview.switch')}>
          <button
            type="button"
            className={styles.navButton}
            disabled={monthKey <= view.earliestMonth}
            onClick={() => setMonthKey((current) => shiftMonthKey(current, -1))}
          >
            {t('monthReview.previous')}
          </button>
          <button
            type="button"
            className={styles.navButton}
            disabled={monthKey >= defaultMonth}
            onClick={() => setMonthKey((current) => shiftMonthKey(current, 1))}
          >
            {t('monthReview.next')}
          </button>
        </div>

        <div className={styles.body}>
          {view.status === 'error' ? (
            <div className={styles.error} role="alert">
              <span>{t('monthReview.loadFailed')}</span>
              <button type="button" className={styles.retry} onClick={view.retry}>
                {t('today.retry')}
              </button>
            </div>
          ) : null}

          {view.status !== 'ready' || !review ? (
            <div className={styles.sections} aria-label={t('monthReview.loading')}>
              {SECTION_TITLES.map((titleKey) => (
                <section key={titleKey} className={styles.section}>
                  <h3 className={styles.sectionTitle}>{t(titleKey)}</h3>
                  <span className={styles.skeleton} aria-hidden="true" />
                </section>
              ))}
            </div>
          ) : (
            <div className={styles.sections}>
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>{t('monthReview.total.title')}</h3>
                <p className={styles.total}>
                  {review.total}
                  {t('monthReview.total.commitsSuffix')}
                </p>
                <p className={styles.range}>
                  {review.monthStart}
                  {t('today.weeklySummary.rangeSeparator')}
                  {review.monthEnd}
                </p>
              </section>

              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>{t('monthReview.shares.title')}</h3>
                {review.shares.length === 0 ? (
                  <p className={styles.quiet}>{t('monthReview.shares.empty')}</p>
                ) : (
                  <div className={styles.shareList}>
                    {review.shares.map((share) => (
                      <div key={share.branchId ?? 'root'} className={styles.shareRow}>
                        <span className={styles.shareName}>
                          {share.branchId === null
                            ? t('year.branches.mine')
                            : share.title || share.branchId}
                        </span>
                        <span className={styles.shareRatio}>
                          {Math.round(share.ratio * 100)}
                          {t('monthReview.observation.percentSuffix')}
                        </span>
                        {share.delta !== null ? (
                          <span
                            className={
                              share.direction === null ? styles.delta : styles.deltaEmphasis
                            }
                          >
                            {share.delta > 0 ? '+' : share.delta < 0 ? '−' : ''}
                            {Math.abs(Math.round(share.delta * 100))}
                            {t('monthReview.shares.pointSuffix')}
                            {share.direction
                              ? ` ${t(share.direction === 'up' ? 'monthReview.shares.up' : 'monthReview.shares.down')}`
                              : null}
                          </span>
                        ) : null}
                      </div>
                    ))}
                    {review.shares.every((share) => share.delta === null) ? (
                      <p className={styles.quiet}>{t('monthReview.shares.noPrevious')}</p>
                    ) : null}
                  </div>
                )}
              </section>

              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>{t('monthReview.structure.title')}</h3>
                <dl className={styles.structure}>
                  <div>
                    <dt>{t('monthReview.structure.opened')}</dt>
                    <dd>{review.structure.opened}</dd>
                  </div>
                  <div>
                    <dt>{t('monthReview.structure.finished')}</dt>
                    <dd>{review.structure.finished}</dd>
                  </div>
                  <div>
                    <dt>{t('monthReview.structure.dropped')}</dt>
                    <dd>{review.structure.dropped}</dd>
                  </div>
                </dl>
              </section>

              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>{t('monthReview.stall.title')}</h3>
                {review.stall.count === 0 ? (
                  <p className={styles.quiet}>{t('monthReview.stall.none')}</p>
                ) : (
                  <p className={styles.stall}>
                    {review.stall.count}
                    {t('monthReview.stall.countSuffix')}
                    {t('monthReview.stall.separator')}
                    {review.stall.longestDays}
                    {t('monthReview.stall.daysSuffix')}
                  </p>
                )}
              </section>

              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>{t('monthReview.observation.title')}</h3>
                <p className={styles.observation}>{observationText(review)}</p>
              </section>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
