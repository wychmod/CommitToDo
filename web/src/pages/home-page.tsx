import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import { PageShell } from '@/ui/page-shell';
import styles from './pages.module.css';

/** P00 首页：独立于应用外壳，只保留入口。 */
export function HomePage() {
  return (
    <PageShell
      titleKey="page.home.title"
      bodyKey="page.home.body"
      action={
        <Link className={styles.link} to="/today">
          {t('page.home.open')}
        </Link>
      }
    />
  );
}
