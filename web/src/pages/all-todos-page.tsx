import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { displayBranchTrail } from '@/core/rules/branch-path';
import { groupAllTodoTasks, sortByManualOrder } from '@/core/rules/today-groups';
import { cancelTask } from '@/data/cancel-task';
import { completeTask } from '@/data/complete-task';
import { useAllTodosData, useTodayDate } from '@/data/hooks';
import { planTask } from '@/data/plan-task';
import type { Branch, Task } from '@/data/types';
import { t } from '@/i18n';
import { useShellStore } from '@/stores/shell.store';
import { useTodayStore } from '@/stores/today.store';
import { ArrowLeftIcon, ChevronDownIcon } from '@/ui/icons';
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

type AllGroupKey = 'overdue' | 'upcoming' | 'noDue';

const GROUP_LABEL = {
  overdue: 'today.group.overdue',
  upcoming: 'today.group.future',
  noDue: 'today.group.noDue',
} as const;

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
  const manualGroups = useTodayStore((state) => state.manualGroups);
  const todayDate = useTodayDate();
  const [filters, setFilters] = useState<Filters>({ root: false, dropped: false, archived: false });
  const [openGroups, setOpenGroups] = useState<Record<AllGroupKey, boolean>>({
    overdue: false,
    upcoming: true,
    noDue: true,
  });
  const [pageError, setPageError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Task | null>(null);

  const byId = useMemo(
    () => new Map(data.branches.map((branch) => [branch.id, branch])),
    [data.branches],
  );
  const root = data.branches.find((branch) => branch.depth === 0 && branch.deletedAt === null);

  const visibleTasks = useMemo(() => {
    const anyFilter = filters.root || filters.dropped || filters.archived;
    return data.tasks.filter((task) => {
      const branch = byId.get(task.branchId);
      if (!branch) return false;
      if (!anyFilter) return isInDefaultTree(task.branchId, byId);
      if (filters.root && branch.id !== root?.id) return false;
      if (filters.dropped && branch.status !== 'dropped') return false;
      if (filters.archived && branch.archivedAt === null) return false;
      return true;
    });
  }, [byId, data.tasks, filters, root?.id]);

  const groups = useMemo(() => {
    const base = groupAllTodoTasks(visibleTasks, todayDate);
    return {
      ...base,
      overdue: manualGroups.overdue ? sortByManualOrder(base.overdue) : base.overdue,
      noDue: manualGroups.noDue ? sortByManualOrder(base.noDue) : base.noDue,
    };
  }, [visibleTasks, todayDate, manualGroups]);
  const total = groups.overdue.length + groups.upcoming.length + groups.noDue.length;

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

  const toggle = (key: keyof Filters) =>
    setFilters((current) => ({ ...current, [key]: !current[key] }));

  const renderRow = (task: Task) => {
    const branch = byId.get(task.branchId);
    return (
      <TaskRow
        key={task.id}
        task={task}
        branch={branch}
        branchTrail={branch ? displayBranchTrail(branch, byId) : task.branchId}
        todayDate={todayDate}
        readonlyReason={readonlyReasonKey(branch)}
        busy={busyId === task.id}
        error={failedId === task.id}
        showReorder={false}
        dragEnabled={false}
        onComplete={(row) => void complete(row)}
        onOpen={(row) => openTaskDetail(row.id)}
        onPlan={(row) => void plan(row, todayDate)}
        onUnplan={(row) => void plan(row, null)}
        onCancel={setCancelTarget}
      />
    );
  };

  const renderGroup = (key: AllGroupKey, tasks: Task[]) => {
    const open = openGroups[key];
    return (
      <section className={styles.group} key={key}>
        <div className={styles.groupHead}>
          <h2>
            <span>{t(GROUP_LABEL[key])}</span>
            <span className={styles.count}>{tasks.length}</span>
          </h2>
          <button
            type="button"
            className={styles.expander}
            aria-expanded={open}
            onClick={() => setOpenGroups((current) => ({ ...current, [key]: !current[key] }))}
          >
            {open ? t('today.group.collapse') : t('today.group.expand')}
            <ChevronDownIcon size={16} className={open ? styles.chevronOpen : styles.chevron} />
          </button>
        </div>
        {open && tasks.length > 0 ? <ul className={styles.list}>{tasks.map(renderRow)}</ul> : null}
        {tasks.length === 0 ? (
          <p className={styles.groupEmpty}>{t('today.all.groupEmpty')}</p>
        ) : null}
      </section>
    );
  };

  return (
    <PageShell
      back={
        <Link className={styles.back} to="/today">
          <ArrowLeftIcon size={16} />
          {t('today.all.back')}
        </Link>
      }
      titleKey="today.all.title"
    >
      {data.status === 'loading' ? (
        <div className={styles.table} aria-hidden="true">
          <div className={styles.groupHead}>
            <h2>
              <span>{t('today.group.overdue')}</span>
              <span className={styles.count}>—</span>
            </h2>
          </div>
          <div className={styles.skeletonRow}>
            <span className={styles.skeletonCheck} />
            <span className={styles.skeletonLine} />
          </div>
          <div className={styles.skeletonRow}>
            <span className={styles.skeletonCheck} />
            <span className={styles.skeletonLong} />
          </div>
        </div>
      ) : null}

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
          <div className={styles.toolbar}>
            <span className={styles.filterLabel}>{t('today.all.filter')}</span>
            <label className={styles.chip}>
              <input type="checkbox" checked={filters.root} onChange={() => toggle('root')} />
              <span>{t('today.all.filter.root')}</span>
            </label>
            <label className={styles.chip}>
              <input type="checkbox" checked={filters.dropped} onChange={() => toggle('dropped')} />
              <span>{t('today.all.filter.dropped')}</span>
            </label>
            <label className={styles.chip}>
              <input
                type="checkbox"
                checked={filters.archived}
                onChange={() => toggle('archived')}
              />
              <span>{t('today.all.filter.archived')}</span>
            </label>
            <span className={styles.summary}>
              {t('today.all.summaryPrefix')}
              {total}
            </span>
          </div>

          {pageError ? (
            <p className={styles.inlineError} role="alert">
              {pageError}
            </p>
          ) : null}

          {total === 0 ? (
            <div className={styles.empty}>
              <p>{t('today.all.empty')}</p>
              <Link to="/today">{t('today.all.back')}</Link>
            </div>
          ) : (
            <div className={styles.table}>
              {renderGroup('overdue', groups.overdue)}
              {renderGroup('upcoming', groups.upcoming)}
              {renderGroup('noDue', groups.noDue)}
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
          onConfirm={() => void confirmCancel()}
          onClose={() => setCancelTarget(null)}
        />
      ) : null}
    </PageShell>
  );
}
