import { Link } from 'react-router-dom';
import { useBadges } from '@/data/hooks';
import { t } from '@/i18n';
import { EmptyState } from '@/ui/empty-state';
import { LoadingShell } from '@/ui/loading-shell';
import { PageShell } from '@/ui/page-shell';
import styles from './pages.module.css';

/** P06 我的：徽章列表 + 设置与数据入口（一级导航只保留四项，这两个入口从这里进）。 */
export function MePage() {
  const badges = useBadges();

  return (
    <PageShell titleKey="page.me.title" bodyKey="page.me.body">
      <div className={styles.sections}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('page.me.badges')}</h2>
          {!badges ? (
            <LoadingShell />
          ) : badges.length === 0 ? (
            <EmptyState
              messageKey="page.me.badgeEmpty"
              action={
                <Link className={styles.action} to="/today">
                  {t('page.me.action')}
                </Link>
              }
            />
          ) : (
            <ul className={styles.list}>
              {badges.map((badge) => (
                <li key={badge.id}>{badge.catalogId}</li>
              ))}
            </ul>
          )}
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
