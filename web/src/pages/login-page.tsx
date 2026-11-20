import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import { PageShell } from '@/ui/page-shell';
import styles from './pages.module.css';

/** P09 登录：V2 提供，独立于应用外壳。 */
export function LoginPage() {
  return (
    <PageShell
      titleKey="page.login.title"
      bodyKey="page.login.body"
      action={
        <Link className={styles.link} to="/today">
          {t('page.auth.local')}
        </Link>
      }
    />
  );
}
