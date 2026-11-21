import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { localDate } from '@/core/clock';
import { badgeHref, badgeNameKey, badgeSourceKey } from '@/components/badges/badge-presentation';
import { isBadgeBackfillSkipped } from '@/components/badges/backfill-guard';
import { grantBadge } from '@/data/grant-badge';
import { useBadgeRows } from '@/data/hooks';
import { t } from '@/i18n';
import { EmptyState } from '@/ui/empty-state';
import { LoadingShell } from '@/ui/loading-shell';
import { PageShell } from '@/ui/page-shell';
import styles from './pages.module.css';

/** P06 我的：已获徽章 + 设置与数据入口（MRD M11 OP-03 / OP-04 / OP-05）。 */
export function MePage() {
  const view = useBadgeRows();

  // 进入「我的」时补查漏发的徽章；导入后的本次会话跳过（OP-08）。
  useEffect(() => {
    if (view.status !== 'ready') return;
    if (isBadgeBackfillSkipped()) return;
    void grantBadge();
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
          {view.status === 'ready' && view.rows.length === 0 ? (
            <EmptyState
              messageKey="page.me.badgeEmpty"
              action={
                <Link className={styles.action} to="/today">
                  {t('page.me.action')}
                </Link>
              }
            />
          ) : null}
          {view.status === 'ready' && view.rows.length > 0 ? (
            <ul className={styles.badgeList}>
              {view.rows.map((row) => (
                <li key={row.badge.id} className={styles.badgeCard}>
                  <div className={styles.badgeHead}>
                    <strong>{t(badgeNameKey(row.badge.catalogId))}</strong>
                    <span className={styles.badgeDate}>
                      {t('badge.grantedAt')} {localDate(row.badge.grantedAt)}
                    </span>
                  </div>
                  <p className={styles.badgeSource}>{t(badgeSourceKey(row.badge.catalogId))}</p>
                  {row.state === 'ok' && row.jump ? (
                    <Link className={styles.badgeAction} to={badgeHref(row.jump)}>
                      {t('badge.viewHistory')}
                    </Link>
                  ) : (
                    <span className={styles.badgeState}>
                      {t(row.state === 'revoked' ? 'badge.revoked' : 'badge.missing')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
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
