import { useParams } from 'react-router-dom';
import { PageShell } from '@/ui/page-shell';
import styles from './pages.module.css';

/** P05 年轮：V1 提供，当前只有占位。 */
export function YearPage() {
  const { year } = useParams<{ year: string }>();

  return (
    <PageShell titleKey="page.year.title" bodyKey="page.year.body">
      {year ? <p className={styles.quiet}>{year}</p> : null}
    </PageShell>
  );
}
