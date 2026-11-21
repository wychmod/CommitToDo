import { useOpenTasks } from '@/data/hooks';
import { t } from '@/i18n';
import { useShellStore } from '@/stores/shell.store';
import { EmptyState } from '@/ui/empty-state';
import { LoadingShell } from '@/ui/loading-shell';
import { PageShell } from '@/ui/page-shell';
import styles from './pages.module.css';

/**
 * P01 今天。
 *
 * 空态给一个主行动作「记一笔」，接到全局快速添加浮层；
 * 有数据时动作移到页头，空态不再重复出现第二个同等权重的按钮。
 */
export function TodayPage() {
  const tasks = useOpenTasks();
  const openOverlay = useShellStore((state) => state.openOverlay);
  const hasTasks = Boolean(tasks && tasks.length > 0);

  return (
    <PageShell
      titleKey="page.today.title"
      bodyKey="page.today.body"
      action={
        hasTasks ? (
          <button type="button" className={styles.action} onClick={() => openOverlay('quick-add')}>
            {t('page.today.action')}
          </button>
        ) : undefined
      }
    >
      {!tasks ? (
        <LoadingShell />
      ) : tasks.length === 0 ? (
        <EmptyState
          messageKey="page.today.empty"
          action={
            <button
              type="button"
              className={styles.action}
              onClick={() => openOverlay('quick-add')}
            >
              {t('page.today.action')}
            </button>
          }
        />
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
