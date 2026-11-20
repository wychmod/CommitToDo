import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import { PageShell } from '@/ui/page-shell';
import styles from './pages.module.css';

/** 404：未知路由落在应用外壳内，保留导航。 */
export function NotFoundPage() {
  return (
    <PageShell
      titleKey="page.notFound.title"
      bodyKey="page.notFound.body"
      action={
        <Link className={styles.link} to="/today">
          {t('page.notFound.back')}
        </Link>
      }
    />
  );
}
