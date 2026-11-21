import { useMemo, useState } from 'react';
import type { BranchReadonlyReason } from '@/core/rules/branch-state';
import { cancelTask } from '@/data/cancel-task';
import { completeTask } from '@/data/complete-task';
import { planTask } from '@/data/plan-task';
import type { Branch, Task } from '@/data/types';
import { t } from '@/i18n';
import { ConfirmDialog } from '@/components/today/confirm-dialog';
import { TaskRow } from '@/components/today/task-row';
import { branchReadonlyKey } from './readonly';
import styles from './branch-tasks-section.module.css';

interface BranchTasksSectionProps {
  branch: Branch;
  branchTrail: string;
  tasks: readonly Task[];
  status: 'loading' | 'ready' | 'error';
  retry: () => void;
  readonlyReason: BranchReadonlyReason | null;
  todayDate: string;
  onOpenTask: (task: Task) => void;
  onAddTask: () => void;
}

function compareOpenTasks(a: Task, b: Task): number {
  if (a.dueDate === b.dueDate) return a.createdAt - b.createdAt;
  if (a.dueDate === null) return 1;
  if (b.dueDate === null) return -1;
  return a.dueDate < b.dueDate ? -1 : 1;
}

/**
 * 分支详情 · 待办区（M04 §4.2）。
 *
 * 只列本分支直属的未完成待办，按截止日期升序、无截止排最后；
 * 已完成与已取消不混进列表，只在下方给一行计数。
 */
export function BranchTasksSection({
  branch,
  branchTrail,
  tasks,
  status,
  retry,
  readonlyReason,
  todayDate,
  onOpenTask,
  onAddTask,
}: BranchTasksSectionProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Task | null>(null);

  const open = useMemo(
    () =>
      tasks
        .filter((task) => task.status === 'open' && task.deletedAt === null)
        .sort(compareOpenTasks),
    [tasks],
  );
  const doneCount = tasks.filter(
    (task) => task.status === 'done' && task.deletedAt === null,
  ).length;
  const cancelledCount = tasks.filter(
    (task) => task.status === 'cancelled' && task.deletedAt === null,
  ).length;

  const readonly = readonlyReason !== null;

  const complete = async (task: Task) => {
    if (busyId) return;
    setBusyId(task.id);
    setFailedId(null);
    const result = await completeTask({ taskId: task.id });
    setBusyId(null);
    if (result.ok) setPageError(null);
    else setFailedId(task.id);
  };

  const plan = async (task: Task, plannedDate: string | null) => {
    const result = await planTask({ taskId: task.id, plannedDate });
    setPageError(result.ok ? null : t('today.writeFailed'));
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setBusyId(cancelTarget.id);
    const result = await cancelTask({ taskId: cancelTarget.id });
    setBusyId(null);
    setCancelTarget(null);
    setPageError(result.ok ? null : t('today.writeFailed'));
  };

  return (
    <section className={styles.section} aria-labelledby="branch-tasks-title">
      <div className={styles.head}>
        <h2 id="branch-tasks-title" className={styles.title}>
          {t('branchDetail.section.tasks')}
          <span className={styles.count}>{open.length}</span>
        </h2>
        <button
          type="button"
          className={styles.add}
          onClick={onAddTask}
          disabled={readonly}
          title={readonlyReason ? t(branchReadonlyKey(readonlyReason)) : undefined}
        >
          {t('branchDetail.tasks.add')}
        </button>
      </div>

      {status === 'loading' ? (
        <p className={styles.empty} role="status">
          {t('state.loading')}
        </p>
      ) : null}

      {status === 'error' ? (
        <div className={styles.errorBox} role="alert">
          <p className={styles.error}>{t('branchDetail.sectionLoadFailed')}</p>
          <button type="button" className={styles.add} onClick={retry}>
            {t('branchDetail.retry')}
          </button>
        </div>
      ) : null}

      {status === 'ready' && pageError ? (
        <p className={styles.error} role="alert">
          {pageError}
        </p>
      ) : null}

      {status === 'ready' && open.length === 0 ? (
        <p className={styles.empty}>{t('branchDetail.tasks.empty')}</p>
      ) : null}

      {status === 'ready' && open.length > 0 ? (
        <ul className={styles.list}>
          {open.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              branch={branch}
              branchTrail={branchTrail}
              todayDate={todayDate}
              readonlyReason={readonlyReason ? branchReadonlyKey(readonlyReason) : null}
              busy={busyId === task.id}
              error={failedId === task.id}
              onComplete={complete}
              onOpen={onOpenTask}
              onPlan={(row) => void plan(row, todayDate)}
              onUnplan={(row) => void plan(row, null)}
              onCancel={setCancelTarget}
            />
          ))}
        </ul>
      ) : null}

      {status === 'ready' && doneCount + cancelledCount > 0 ? (
        <p className={styles.summary}>
          {t('branchDetail.tasks.donePrefix')}
          {doneCount}
          {t('branchDetail.tasks.doneMiddle')}
          {cancelledCount}
          {t('branchDetail.tasks.doneSuffix')}
        </p>
      ) : null}

      {cancelTarget ? (
        <ConfirmDialog
          titleKey="taskDetail.cancelTitle"
          bodyKey="taskDetail.cancelBody"
          confirmKey="taskDetail.confirmCancel"
          busy={busyId === cancelTarget.id}
          onConfirm={confirmCancel}
          onClose={() => setCancelTarget(null)}
        />
      ) : null}
    </section>
  );
}
