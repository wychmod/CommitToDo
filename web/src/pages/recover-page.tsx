import { Link } from 'react-router-dom';
import { t } from '@/i18n';
import { PageShell } from '@/ui/page-shell';
import styles from './pages.module.css';

/** P11 找回密码：同一路由承载三步，V2 提供。 */
export function RecoverPage() {
  return (
    <PageShell
      titleKey="page.recover.title"
      bodyKey="page.recover.body"
      action={
        <Link className={styles.link} to="/auth/login">
          {t('page.login.title')}
        </Link>
      }
    />
  );
}
