import { useEffect, useRef } from 'react';
import { useWeekReview } from '@/data/hooks';
import { trackOpsEvent } from '@/data/ops-events';
import { t } from '@/i18n';
import { useReviewStore } from '@/stores/review.store';
import styles from './week-review-card.module.css';

/**
 * 回顾卡（S01-week-review / V1-03）。
 *
 * 本周摘要每天出现；正式周回顾只在周六、周日与周一叠加，摘要始终在上。
 * 展开状态与月回顾入口只保存在会话内。
 */
export function WeekReviewCard() {
  const view = useWeekReview();
  const expanded = useReviewStore((state) => state.expanded);
  const toggleExpanded = useReviewStore((state) => state.toggleExpanded);
  const openMonth = useReviewStore((state) => state.openMonth);
  const reported = useRef(false);
  const summary = view.summary;
  const stats = view.stats;
  const question = view.question;

  // 展开周回顾即视为进入一次回顾；重渲染与折叠再展开不重复上报。
  useEffect(() => {
    if (!expanded || reported.current) return;
    reported.current = true;
    trackOpsEvent('review.open', { kind: 'week' });
  }, [expanded]);

  const sentence =
    question?.template === 'today.weekReview.question.topBranch'
      ? `${t('today.weekReview.question.topBranchPrefix')}${question.branchTitle ?? '—'}${t('today.weekReview.question.topBranchSuffix')}`
      : `${t('today.weekReview.question.genericPrefix')}${stats?.commitCount ?? 0}${t('today.weekReview.question.genericSuffix')}`;

  return (
    <section id="week-review-card" className={styles.card} aria-label={t('today.review.title')}>
      <div className={styles.head}>
        <button
          id="week-review-toggle"
          type="button"
          className={styles.toggle}
          aria-expanded={expanded}
          aria-controls="week-review-panel"
          aria-label={
            expanded ? t('today.weeklySummary.collapse') : t('today.weeklySummary.expand')
          }
          onClick={toggleExpanded}
        >
          <span className={styles.title}>{t('today.weeklySummary.title')}</span>
          {view.status === 'loading' ? (
            <span className={styles.skeleton} aria-hidden="true" />
          ) : view.status === 'error' ? (
            <span className={styles.hint}>{t('today.weekReview.loadFailed')}</span>
          ) : (
            <span className={styles.collapsed}>
              {t('today.weeklySummary.collapsedPrefix')}
              {summary?.commitCount ?? 0}
              {t('today.weeklySummary.collapsedMiddle')}
              {summary?.stallCount ?? 0}
              {t('today.weeklySummary.collapsedSuffix')}
            </span>
          )}
        </button>
        <button type="button" className={styles.monthLink} onClick={openMonth}>
          {t('monthReview.open')}
        </button>
      </div>

      {expanded ? (
        <div id="week-review-panel" className={styles.panel}>
          {view.status === 'loading' ? (
            <span className={styles.panelSkeleton} aria-label={t('today.weeklySummary.loading')} />
          ) : null}

          {view.status === 'error' ? (
            <>
              <p className={styles.error}>{t('today.weekReview.loadFailed')}</p>
              <button type="button" className={styles.retry} onClick={view.retry}>
                {t('today.retry')}
              </button>
            </>
          ) : null}

          {view.status === 'ready' && summary ? (
            <section className={styles.summaryBlock} aria-label={t('today.weeklySummary.title')}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>{t('today.weeklySummary.title')}</h2>
                <span className={styles.range}>
                  {summary.weekStart}
                  {t('today.weeklySummary.rangeSeparator')}
                  {summary.weekEnd}
                </span>
              </div>
              <dl className={styles.facts}>
                <div className={styles.fact}>
                  <dt>{t('today.weekReview.commits')}</dt>
                  <dd>{summary.commitCount}</dd>
                </div>
                <div className={styles.fact}>
                  <dt>{t('today.weeklySummary.stalled')}</dt>
                  <dd>
                    {summary.stallCount}
                    {t('today.weekReview.branchesSuffix')}
                  </dd>
                </div>
              </dl>
              {summary.stallCount === 0 ? (
                <p className={styles.stallText}>{t('today.weeklySummary.noStalls')}</p>
              ) : (
                <p className={styles.stallText}>
                  {summary.stallCount}
                  {t('today.weeklySummary.stallDescription')}
                  {summary.stalledBranches.length > 0
                    ? `${t('today.weeklySummary.namesPrefix')}${summary.stalledBranches
                        .map((branch) => branch.title)
                        .join(
                          t('today.weeklySummary.namesSeparator'),
                        )}${t('today.weeklySummary.namesSuffix')}`
                    : null}
                </p>
              )}
            </section>
          ) : null}

          {view.status === 'ready' && stats?.visible ? (
            <section className={styles.formalBlock} aria-label={t('today.weekReview.title')}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>{t('today.weekReview.title')}</h2>
                <span className={styles.range}>
                  {stats.weekStart}
                  {t('today.weeklySummary.rangeSeparator')}
                  {stats.weekEnd}
                </span>
              </div>
              <dl className={styles.facts}>
                <div className={styles.fact}>
                  <dt>{t('today.weekReview.commits')}</dt>
                  <dd>{stats.commitCount}</dd>
                </div>
                <div className={styles.fact}>
                  <dt>{t('today.weekReview.branches')}</dt>
                  <dd>
                    {stats.activeBranchCount}
                    {t('today.weekReview.branchesSuffix')}
                  </dd>
                </div>
                <div className={styles.fact}>
                  <dt>{t('today.weekReview.streak')}</dt>
                  <dd>
                    {stats.streakWeeks}
                    {t('today.weekReview.weeksSuffix')}
                  </dd>
                </div>
              </dl>
              {question ? <p className={styles.question}>{sentence}</p> : null}
            </section>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
