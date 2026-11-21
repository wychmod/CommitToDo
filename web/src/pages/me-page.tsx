import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { isBadgeBackfillSkipped } from '@/components/badges/backfill-guard';
import { grantBadge } from '@/data/grant-badge';
import { useBadgeRows } from '@/data/hooks';
import { t } from '@/i18n';
import { LoadingShell } from '@/ui/loading-shell';
import { PageShell } from '@/ui/page-shell';
import styles from './pages.module.css';

/** P06 我的：徽章墙入口 + 设置与数据入口（V1-05 OP-01 / M11 OP-03–OP-05）。 */
export function MePage() {
  const view = useBadgeRows();

  // 进入「我的」时补查漏发的徽章；导入后的本次会话跳过（OP-08）。
  useEffect(() => {
    if (view.status !== 'ready') return;
    void grantBadge(undefined, { skipBackfill: isBadgeBackfillSkipped() });
  }, [view.status]);

  return (
    <PageShell titleKey="page.me.title" bodyKey="page.me.body">
      <div className={styles.sections}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('page.me.badges')}</h2>
          {view.status === 'loading' ? <LoadingShell /> : null}
          {view.status === 'error' ? (
            <div className={styles.inlineError} role="alert">
              <span>{t('page.me.badgeFailed')}</span>
              <button type="button" className={styles.retry} onClick={view.retry}>
                {t('error.retry')}
              </button>
            </div>
          ) : null}
          {view.status === 'ready' ? (
            <div className={styles.badgeSummary}>
              <p className={styles.badgeCount}>
                {t('badge.wall.headerPrefix')} {view.wall.earnedCount} / {view.wall.total}
              </p>
              {view.wall.earnedCount === 0 ? (
                <p className={styles.quiet}>{t('badge.wall.empty')}</p>
              ) : null}
              <Link className={styles.action} to="/me/badges">
                {t('badge.wall.title')}
              </Link>
            </div>
          ) : null}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('page.me.shortcuts')}</h2>
          <ul className={styles.list}>
            <li>
              <Link to="/settings">{t('nav.settings')}</Link>
            </li>
            <li>
              <Link to="/data">{t('nav.data')}</Link>
            </li>
          </ul>
        </section>
      </div>
    </PageShell>
  );
}
