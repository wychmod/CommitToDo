import { useState } from 'react';
import { useWeekReview } from '@/data/hooks';
import { t } from '@/i18n';
import styles from './week-review-card.module.css';

/**
 * 周回顾卡片（S01-week-review，M09）。
 *
 * 只在周六/周日且本周有有效提交时渲染；折叠态一行事实，展开后三项统计与一句提问。
 * 只读、无输入、无建议；关闭后本次会话不自动展开，展开状态不持久化。
 */
export function WeekReviewCard() {
  const view = useWeekReview();
  const [expanded, setExpanded] = useState(false);

  if (view.status === 'loading') {
    return (
      <section className={styles.card} aria-label={t('today.weekReview.title')}>
        <div className={styles.head}>
          <span className={styles.title}>{t('today.weekReview.title')}</span>
          <span className={styles.skeleton} aria-hidden="true" />
        </div>
      </section>
    );
  }

  if (view.status === 'error') {
    return (
      <section className={styles.card} aria-label={t('today.weekReview.title')}>
        <button
          type="button"
          className={styles.head}
          aria-expanded={expanded}
          aria-label={expanded ? t('today.weekReview.collapse') : t('today.weekReview.expand')}
          onClick={() => setExpanded((value) => !value)}
        >
          <span className={styles.title}>{t('today.weekReview.title')}</span>
          <span className={styles.hint}>{t('today.weekReview.loadFailed')}</span>
        </button>
        {expanded ? (
          <div className={styles.panel}>
            <p className={styles.error}>{t('today.weekReview.loadFailed')}</p>
            <button type="button" className={styles.retry} onClick={view.retry}>
              {t('today.retry')}
            </button>
          </div>
        ) : null}
      </section>
    );
  }

  const stats = view.stats;
  const question = view.question;
  if (!stats?.visible) return null;

  const sentence =
    question?.template === 'today.weekReview.question.topBranch'
      ? `${t('today.weekReview.question.topBranchPrefix')}${question.branchTitle ?? '—'}${t('today.weekReview.question.topBranchSuffix')}`
      : `${t('today.weekReview.question.genericPrefix')}${stats.commitCount}${t('today.weekReview.question.genericSuffix')}`;

  return (
    <section className={styles.card} aria-label={t('today.weekReview.title')}>
      <button
        type="button"
        className={styles.head}
        aria-expanded={expanded}
        aria-label={expanded ? t('today.weekReview.collapse') : t('today.weekReview.expand')}
        onClick={() => setExpanded((value) => !value)}
      >
        <span className={styles.title}>{t('today.weekReview.title')}</span>
        <span className={styles.collapsed}>
          {t('today.weekReview.collapsedPrefix')}
          {stats.commitCount}
          {t('today.weekReview.collapsedMiddle')}
          {stats.activeBranchCount}
          {t('today.weekReview.collapsedSuffix')}
        </span>
      </button>

      {expanded ? (
        <div className={styles.panel}>
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
        </div>
      ) : null}
    </section>
  );
}
