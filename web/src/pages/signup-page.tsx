import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import { PageShell } from '@/ui/page-shell';
import styles from './pages.module.css';

/** P10 注册：V2 提供，独立于应用外壳。 */
export function SignupPage() {
  return (
    <PageShell
      titleKey="page.signup.title"
      bodyKey="page.signup.body"
      action={
        <Link className={styles.link} to="/today">
          {t('page.auth.local')}
        </Link>
      }
    />
  );
}
