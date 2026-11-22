import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import { EmptyState } from '@/ui/empty-state';
import { PageShell } from '@/ui/page-shell';
import styles from './pages.module.css';

/** 404：未知路由落在应用外壳内，保留导航。无画稿，按系统空态与按钮规格自拟。 */
export function NotFoundPage() {
  return (
    <PageShell titleKey="page.notFound.title" bodyKey="page.notFound.body">
      <EmptyState
        messageKey="page.notFound.empty"
        action={
          <>
            <Link className={styles.link} to="/today">
              {t('page.notFound.back')}
            </Link>
            <Link className={styles.quietLink} to="/">
              {t('page.notFound.home')}
            </Link>
          </>
        }
      />
    </PageShell>
  );
}
