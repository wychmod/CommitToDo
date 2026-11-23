import { useMemo, useState, type CSSProperties } from 'react';
import { systemClock, today } from '@/core/clock';
import { branchShadeForDepth, normalizeBranchColor } from '@/core/rules/branch-color';
import { displayBranchTrail } from '@/core/rules/branch-path';
import { groupAllTodoTasks, sortByManualOrder } from '@/core/rules/today-groups';
import { completeTask } from '@/data/complete-task';
import { useAllTodosData } from '@/data/hooks';
import type { Branch, Task } from '@/data/types';
import { t } from '@/i18n';
import { useShellStore } from '@/stores/shell.store';
import { useTodayStore } from '@/stores/today.store';
import { EmptyState } from '@/ui/empty-state';
import { ChevronRightIcon, PlusIcon } from '@/ui/icons';
import { LoadingShell } from '@/ui/loading-shell';
import { PageShell } from '@/ui/page-shell';
import { readonlyReasonKey } from '@/components/today/readonly';
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

function dueLabel(task: Task, todayDate: string): string {
  if (!task.dueDate) return t('today.task.noDue');
  if (task.dueDate === todayDate) return t('today.task.todayLabel');
  const [, month, day] = task.dueDate.split('-').map(Number);
  return `${month}${t('milestone.date.monthSuffix')} ${day}${t('milestone.date.daySuffix')}`;
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
  const openOverlay = useShellStore((state) => state.openOverlay);
  const manualGroups = useTodayStore((state) => state.manualGroups);
  const todayDate = today(systemClock);
  const [filters, setFilters] = useState<Filters>({ root: false, dropped: false, archived: false });
  const [pageError, setPageError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);

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

  const toggle = (key: keyof Filters) =>
    setFilters((current) => ({ ...current, [key]: !current[key] }));

  const renderRow = (task: Task) => {
    const branch = byId.get(task.branchId);
    const readonlyReason = readonlyReasonKey(branch);
    const color = branch ? normalizeBranchColor(branch.color) : 'sky';
    const shade = branch ? branchShadeForDepth(branch.depth) : 1;
    const path = branch ? displayBranchTrail(branch, byId) : '';
    const busy = busyId === task.id;

    return (
      <div
        key={task.id}
        className={failedId === task.id ? `${styles.row} ${styles.rowError}` : styles.row}
      >
        <span className={styles.rowMain}>
          <button
            type="button"
            className={styles.check}
            aria-label={t('today.task.complete')}
            disabled={busy || readonlyReason !== null}
            onClick={() => void complete(task)}
          />
          {readonlyReason ? (
            <span className={styles.nameText}>{task.title}</span>
          ) : (
            <button type="button" className={styles.name} onClick={() => openTaskDetail(task.id)}>
              {task.title}
            </button>
          )}
          {readonlyReason ? <span className={styles.readonly}>{t(readonlyReason)}</span> : null}
        </span>

        {branch ? (
          <span
            className={styles.identity}
            style={{ '--branch': `var(--${color}-${shade})` } as CSSProperties}
          >
            <i className={styles.branchDot} aria-hidden="true" />
            {path}
          </span>
        ) : (
          <span />
        )}

        <span className={styles.due}>{dueLabel(task, todayDate)}</span>

        <button
          type="button"
          className={styles.chevron}
          aria-label={t('today.task.open')}
          onClick={() => openTaskDetail(task.id)}
        >
          <ChevronRightIcon size={16} />
        </button>
      </div>
    );
  };

  const renderGroup = (titleKey: Parameters<typeof t>[0], tasks: Task[]) => (
    <section className={styles.group}>
      <h2 className={styles.groupTitle}>
        {t(titleKey)}
        <small>{tasks.length}</small>
      </h2>
      {tasks.map((task) => renderRow(task))}
    </section>
  );

  return (
    <PageShell
      titleKey="today.all.title"
      eyebrow={<span className={styles.eyebrow}>{t('today.all.eyebrow')}</span>}
      bodyKey="today.all.body"
      action={
        <button type="button" className={styles.add} onClick={() => openOverlay('quick-add')}>
          <PlusIcon size={16} />
          {t('today.all.add')}
        </button>
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
          <div className={styles.toolbar}>
            <span className={styles.chipInfo}>
              {t('today.all.summaryPrefix')}
              {total}
            </span>
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
            <span className={styles.sort}>{t('today.all.sort')}</span>
          </div>

          {pageError ? (
            <p className={styles.inlineError} role="alert">
              {pageError}
            </p>
          ) : null}

          {total === 0 ? (
            <EmptyState messageKey="today.all.empty" />
          ) : (
            <div className={styles.table}>
              {groups.overdue.length > 0
                ? renderGroup('today.group.overdue', groups.overdue)
                : null}
              {groups.upcoming.length > 0
                ? renderGroup('today.group.future', groups.upcoming)
                : null}
              {groups.noDue.length > 0 ? renderGroup('today.group.noDue', groups.noDue) : null}
            </div>
          )}
        </>
      ) : null}
    </PageShell>
  );
}
