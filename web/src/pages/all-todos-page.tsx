import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { systemClock, today } from '@/core/clock';
import { isBranchAccepting } from '@/core/rules/branch-state';
import { branchTrail } from '@/core/rules/quick-add';
import { groupAllTodoTasks } from '@/core/rules/today-groups';
import { cancelTask } from '@/data/cancel-task';
import { completeTask } from '@/data/complete-task';
import { useAllTodosData } from '@/data/hooks';
import { planTask } from '@/data/plan-task';
import type { Branch, Task } from '@/data/types';
import { t } from '@/i18n';
import { useShellStore } from '@/stores/shell.store';
import { EmptyState } from '@/ui/empty-state';
import { LoadingShell } from '@/ui/loading-shell';
import { PageShell } from '@/ui/page-shell';
import { ConfirmDialog } from '@/components/today/confirm-dialog';
import { readonlyReasonKey } from '@/components/today/readonly';
import { TaskRow } from '@/components/today/task-row';
import styles from './all-todos-page.module.css';

interface Filters {
  root: boolean;
  dropped: boolean;
  archived: boolean;
}

function isInDefaultTree(branchId: string, byId: Map<string, Branch>): boolean {
  let current = byId.get(branchId);
  let guard = 0;
  while (current && guard < 8) {
    if (current.deletedAt !== null || current.archivedAt !== null || current.status === 'dropped') {
      return false;
    }
    current = current.parentId ? byId.get(current.parentId) : undefined;
    guard += 1;
  }
  return byId.has(branchId);
}

/**
 * `/today/all` 全部待办（PRD M03 S01）。
 *
 * 默认展示默认树里未完成的待办；「根分支 / 已放下 / 已归档」是可叠加的
 * 筛选条件（同时选中时取交集），已归档与已放下只读。
 */
export function AllTodosPage() {
  const data = useAllTodosData();
  const openTaskDetail = useShellStore((state) => state.openTaskDetail);
  const todayDate = today(systemClock);
  const [filters, setFilters] = useState<Filters>({ root: false, dropped: false, archived: false });
  const [pageError, setPageError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Task | null>(null);

  const byId = useMemo(
    () => new Map(data.branches.map((branch) => [branch.id, branch])),
    [data.branches],
  );
  const root = data.branches.find((branch) => branch.depth === 0 && branch.deletedAt === null);
  const anyFilter = filters.root || filters.dropped || filters.archived;

  const visibleTasks = useMemo(() => {
    return data.tasks.filter((task) => {
      const branch = byId.get(task.branchId);
      if (!branch) return false;
      if (!anyFilter) return isInDefaultTree(task.branchId, byId);
      if (filters.root && branch.id !== root?.id) return false;
      if (filters.dropped && branch.status !== 'dropped') return false;
      if (filters.archived && branch.archivedAt === null) return false;
      return true;
    });
  }, [anyFilter, byId, data.tasks, filters, root?.id]);

  const groups = useMemo(
    () => groupAllTodoTasks(visibleTasks, todayDate),
    [visibleTasks, todayDate],
  );
  const total = groups.overdue.length + groups.upcoming.length + groups.noDue.length;

  const plan = async (task: Task, plannedDate: string | null) => {
    const result = await planTask({ taskId: task.id, plannedDate });
    setPageError(result.ok ? null : t('today.writeFailed'));
  };

  const complete = async (task: Task) => {
    if (busyId) return;
    setBusyId(task.id);
    setFailedId(null);
    const result = await completeTask({ taskId: task.id });
    setBusyId(null);
    if (result.ok) setPageError(null);
    else setFailedId(task.id);
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setBusyId(cancelTarget.id);
    const result = await cancelTask({ taskId: cancelTarget.id });
    setBusyId(null);
    setCancelTarget(null);
    setPageError(result.ok ? null : t('today.writeFailed'));
  };

  const renderRow = (task: Task) => {
    const branch = byId.get(task.branchId);
    return (
      <TaskRow
        key={task.id}
        task={task}
        branch={branch}
        branchTrail={branch ? branchTrail(branch, byId) : task.branchId}
        todayDate={todayDate}
        readonlyReason={readonlyReasonKey(branch)}
        busy={busyId === task.id}
        error={failedId === task.id}
        onComplete={complete}
        onOpen={(row) => openTaskDetail(row.id)}
        onPlan={(row) => {
          if (branch && isBranchAccepting(branch)) void plan(row, todayDate);
        }}
        onUnplan={(row) => {
          if (branch && isBranchAccepting(branch)) void plan(row, null);
        }}
        onCancel={setCancelTarget}
      />
    );
  };

  const toggle = (key: keyof Filters) =>
    setFilters((current) => ({ ...current, [key]: !current[key] }));

  return (
    <PageShell
      titleKey="today.all.title"
      bodyKey="today.all.body"
      back={
        <Link className={styles.back} to="/today">
          {t('today.all.back')}
        </Link>
      }
    >
      {data.status === 'loading' ? <LoadingShell /> : null}

      {data.status === 'error' ? (
        <div className={styles.errorBox} role="alert">
          <p>{t('today.all.loadFailed')}</p>
          <button type="button" className={styles.retry} onClick={data.retry}>
            {t('today.retry')}
          </button>
        </div>
      ) : null}

      {data.status === 'ready' ? (
        <>
          <div className={styles.filters} role="group" aria-label={t('today.all.filter')}>
            <label className={styles.filter}>
              <input type="checkbox" checked={filters.root} onChange={() => toggle('root')} />
              <span>{t('today.all.filter.root')}</span>
            </label>
            <label className={styles.filter}>
              <input type="checkbox" checked={filters.dropped} onChange={() => toggle('dropped')} />
              <span>{t('today.all.filter.dropped')}</span>
            </label>
            <label className={styles.filter}>
              <input
                type="checkbox"
                checked={filters.archived}
                onChange={() => toggle('archived')}
              />
              <span>{t('today.all.filter.archived')}</span>
            </label>
          </div>

          {pageError ? (
            <p className={styles.inlineError} role="alert">
              {pageError}
            </p>
          ) : null}

          {total === 0 ? (
            <EmptyState messageKey="today.all.empty" />
          ) : (
            <div className={styles.groups}>
              {groups.overdue.length > 0 ? (
                <section className={styles.group}>
                  <div className={styles.groupHead}>
                    <h2 className={styles.groupTitle}>{t('today.group.overdue')}</h2>
                    <span className={styles.groupCount}>
                      {groups.overdue.length}
                      {t('today.group.countSuffix')}
                    </span>
                  </div>
                  <ul className={styles.list}>{groups.overdue.map((task) => renderRow(task))}</ul>
                </section>
              ) : null}

              {groups.upcoming.length > 0 ? (
                <section className={styles.group}>
                  <div className={styles.groupHead}>
                    <h2 className={styles.groupTitle}>{t('today.group.future')}</h2>
                    <span className={styles.groupCount}>
                      {groups.upcoming.length}
                      {t('today.group.countSuffix')}
                    </span>
                  </div>
                  <ul className={styles.list}>{groups.upcoming.map((task) => renderRow(task))}</ul>
                </section>
              ) : null}

              {groups.noDue.length > 0 ? (
                <section className={styles.group}>
                  <div className={styles.groupHead}>
                    <h2 className={styles.groupTitle}>{t('today.group.noDue')}</h2>
                    <span className={styles.groupCount}>
                      {groups.noDue.length}
                      {t('today.group.countSuffix')}
                    </span>
                  </div>
                  <ul className={styles.list}>{groups.noDue.map((task) => renderRow(task))}</ul>
                </section>
              ) : null}
            </div>
          )}
        </>
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
    </PageShell>
  );
}
