import { useOpenTasks } from '@/data/hooks';
import { t } from '@/i18n';
import { LoadingShell } from '@/ui/loading-shell';
import { PageShell } from '@/ui/page-shell';
import styles from './pages.module.css';

/** P01 今天：读路径已接 useLiveQuery，分组规则待实现（§5.3.3 R8）。 */
export function TodayPage() {
  const tasks = useOpenTasks();

  return (
    <PageShell titleKey="page.today.title" bodyKey="page.today.body">
      {!tasks ? (
        <LoadingShell />
      ) : tasks.length === 0 ? (
        <p className={styles.quiet}>{t('page.today.empty')}</p>
      ) : (
        <ul className={styles.list}>
          {tasks.map((task) => (
            <li key={task.id}>{task.title}</li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
