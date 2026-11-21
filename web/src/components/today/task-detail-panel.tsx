import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { localClockTime, localDate, systemClock, today } from '@/core/clock';
import { branchReadonlyReason, isBranchAccepting } from '@/core/rules/branch-state';
import { branchTrail } from '@/core/rules/quick-add';
import { cancelTask } from '@/data/cancel-task';
import { completeTask } from '@/data/complete-task';
import { useTaskDetail } from '@/data/hooks';
import { planTask } from '@/data/plan-task';
import { updateTask } from '@/data/update-task';
import type { Branch, EventRecord, Task } from '@/data/types';
import { t, type MessageKey } from '@/i18n';
import { useShellStore } from '@/stores/shell.store';
import { ConfirmDialog } from './confirm-dialog';
import styles from './task-detail-panel.module.css';

const READONLY_KEYS: Record<string, MessageKey> = {
  archived: 'today.readonly.archived',
  dropped: 'today.readonly.dropped',
  merged: 'today.readonly.merged',
  deleted: 'today.readonly.deleted',
};

const EVENT_KEYS: Record<string, MessageKey> = {
  'task.create': 'taskDetail.event.create',
  'task.update': 'taskDetail.event.update',
  'task.complete': 'taskDetail.event.complete',
  'task.cancel': 'taskDetail.event.cancel',
  'task.plan': 'taskDetail.event.plan',
};

function eventLabel(event: EventRecord): string {
  const key = EVENT_KEYS[event.action];
  return key ? t(key) : t('taskDetail.event.unknown');
}

interface TaskDetailBodyProps {
  task: Task;
  branches: Branch[];
  events: EventRecord[];
}

function TaskDetailBody({ task, branches, events }: TaskDetailBodyProps) {
  const closeOverlay = useShellStore((state) => state.closeOverlay);
  const openCommitDetail = useShellStore((state) => state.openCommitDetail);
  const todayDate = today(systemClock);

  const [title, setTitle] = useState(task.title);
  const [note, setNote] = useState(task.note ?? '');
  const [dueDate, setDueDate] = useState(task.dueDate ?? '');
  const [plannedDate, setPlannedDate] = useState(task.plannedDate ?? '');
  const [branchId, setBranchId] = useState(task.branchId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    setTitle(task.title);
    setNote(task.note ?? '');
    setDueDate(task.dueDate ?? '');
    setPlannedDate(task.plannedDate ?? '');
    setBranchId(task.branchId);
  }, [task.id, task.title, task.note, task.dueDate, task.plannedDate, task.branchId]);

  const byId = useMemo(() => new Map(branches.map((branch) => [branch.id, branch])), [branches]);
  const accepting = useMemo(
    () =>
      branches
        .filter((branch) => branch.deletedAt === null && isBranchAccepting(branch))
        .sort((a, b) => a.depth - b.depth || a.order - b.order),
    [branches],
  );
  const currentBranch = byId.get(task.branchId);
  const branchReason = currentBranch ? branchReadonlyReason(currentBranch) : 'deleted';
  const taskLocked: MessageKey | null =
    task.status === 'done'
      ? 'taskDetail.lockedDone'
      : task.status === 'cancelled'
        ? 'taskDetail.lockedCancelled'
        : branchReason
          ? (READONLY_KEYS[branchReason] ?? 'today.readonly.deleted')
          : null;
  const readonly = taskLocked !== null;

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || readonly) return;
    if (!title.trim()) {
      setError('taskDetail.error.titleEmpty');
      return;
    }
    setBusy(true);
    setError(null);
    const result = await updateTask({
      taskId: task.id,
      title,
      note,
      dueDate: dueDate || null,
      plannedDate: plannedDate || null,
      branchId,
    });
    setBusy(false);
    if (result.ok) closeOverlay();
    else setError('taskDetail.error.storage');
  };

  const complete = async () => {
    if (busy || readonly) return;
    setBusy(true);
    setError(null);
    const result = await completeTask({ taskId: task.id });
    setBusy(false);
    if (result.ok) closeOverlay();
    else setError('taskDetail.error.storage');
  };

  const cancel = async () => {
    if (busy) return;
    setBusy(true);
    const result = await cancelTask({ taskId: task.id });
    setBusy(false);
    setConfirmCancel(false);
    if (result.ok) closeOverlay();
    else setError('taskDetail.error.storage');
  };

  const togglePlan = async () => {
    if (busy || readonly) return;
    setBusy(true);
    const result = await planTask({
      taskId: task.id,
      plannedDate: task.plannedDate === todayDate ? null : todayDate,
    });
    setBusy(false);
    if (!result.ok) setError('taskDetail.error.storage');
  };

  return (
    <>
      <form className={styles.panel} onSubmit={save} aria-label={t('overlay.task-detail.title')}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t('overlay.task-detail.title')}</h2>
          <button type="button" className={styles.close} onClick={closeOverlay}>
            {t('shell.close')}
          </button>
        </div>

        {taskLocked ? <p className={styles.locked}>{t(taskLocked)}</p> : null}
        {task.status !== 'open' ? (
          <p className={styles.status}>{t(`taskDetail.status.${task.status}` as MessageKey)}</p>
        ) : null}

        <label className={styles.field}>
          <span className={styles.label}>{t('taskDetail.field.title')}</span>
          <input
            className={styles.input}
            value={title}
            disabled={readonly || busy}
            placeholder={t('taskDetail.field.titlePlaceholder')}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>{t('taskDetail.field.note')}</span>
          <textarea
            className={`${styles.input} ${styles.textarea}`}
            value={note}
            disabled={readonly || busy}
            placeholder={t('taskDetail.field.notePlaceholder')}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>

        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.label}>{t('taskDetail.field.due')}</span>
            <input
              type="date"
              className={styles.input}
              value={dueDate}
              disabled={readonly || busy}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t('taskDetail.field.planned')}</span>
            <input
              type="date"
              className={styles.input}
              value={plannedDate}
              disabled={readonly || busy}
              onChange={(event) => setPlannedDate(event.target.value)}
            />
          </label>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>{t('taskDetail.field.branch')}</span>
          <select
            className={styles.input}
            value={branchId}
            disabled={readonly || busy}
            onChange={(event) => setBranchId(event.target.value)}
          >
            {!accepting.some((branch) => branch.id === task.branchId) ? (
              <option value={task.branchId}>
                {currentBranch ? branchTrail(currentBranch, byId) : task.branchId}
              </option>
            ) : null}
            {accepting.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branchTrail(branch, byId)}
              </option>
            ))}
          </select>
          {accepting.length === 0 ? (
            <span className={styles.hint}>{t('taskDetail.branchUnavailable')}</span>
          ) : null}
        </label>

        {error ? (
          <p className={styles.error} role="alert">
            {t(error)}
          </p>
        ) : null}

        <div className={styles.actions}>
          {!readonly ? (
            <>
              <button type="submit" className={styles.primary} disabled={busy}>
                {busy ? t('taskDetail.saving') : t('taskDetail.save')}
              </button>
              <button type="button" className={styles.ghost} disabled={busy} onClick={complete}>
                {t('taskDetail.complete')}
              </button>
              <button type="button" className={styles.ghost} disabled={busy} onClick={togglePlan}>
                {task.plannedDate === todayDate
                  ? t('taskDetail.unplan')
                  : t('taskDetail.planToday')}
              </button>
              <button
                type="button"
                className={styles.danger}
                disabled={busy}
                onClick={() => setConfirmCancel(true)}
              >
                {t('taskDetail.cancel')}
              </button>
            </>
          ) : null}
        </div>

        <section className={styles.history}>
          <h3 className={styles.historyTitle}>{t('taskDetail.history')}</h3>
          {events.length === 0 ? (
            <p className={styles.historyEmpty}>{t('taskDetail.historyEmpty')}</p>
          ) : (
            <ol className={styles.historyList}>
              {events.map((event) => (
                <li key={event.id} className={styles.historyItem}>
                  <span className={styles.historyTime}>
                    {localDate(event.at).slice(5)} {localClockTime(event.at)}
                  </span>
                  <span className={styles.historyLabel}>{eventLabel(event)}</span>
                  {event.action === 'task.complete' ? (
                    <button
                      type="button"
                      className={styles.historyLink}
                      onClick={() => {
                        const payload = event.payload as { commitId?: string } | null;
                        if (payload?.commitId) openCommitDetail(payload.commitId);
                      }}
                    >
                      {t('taskDetail.viewCommit')}
                    </button>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </section>
      </form>

      {confirmCancel ? (
        <ConfirmDialog
          titleKey="taskDetail.cancelTitle"
          bodyKey="taskDetail.cancelBody"
          confirmKey="taskDetail.confirmCancel"
          busy={busy}
          onConfirm={cancel}
          onClose={() => setConfirmCancel(false)}
        />
      ) : null}
    </>
  );
}

/** 待办详情（O02）：桌面右侧面板，390 px 全屏。 */
export function TaskDetailPanel() {
  const taskId = useShellStore((state) => state.overlayTaskId);
  const closeOverlay = useShellStore((state) => state.closeOverlay);
  const view = useTaskDetail(taskId);

  return (
    <div className={styles.backdrop} role="presentation" onPointerDown={closeOverlay}>
      <div className={styles.shell} onPointerDown={(event) => event.stopPropagation()}>
        {view.status === 'loading' ? <p className={styles.state}>{t('today.loading')}</p> : null}
        {view.status === 'error' ? (
          <div className={styles.state}>
            <p>{t('taskDetail.error.loadFailed')}</p>
            <button type="button" className={styles.ghost} onClick={view.retry}>
              {t('today.retry')}
            </button>
          </div>
        ) : null}
        {view.status === 'ready' && !view.task ? (
          <div className={styles.state}>
            <p>{t('taskDetail.notFound')}</p>
            <button type="button" className={styles.ghost} onClick={closeOverlay}>
              {t('shell.close')}
            </button>
          </div>
        ) : null}
        {view.status === 'ready' && view.task ? (
          <TaskDetailBody
            key={view.task.id}
            task={view.task}
            branches={view.branches}
            events={view.events}
          />
        ) : null}
      </div>
    </div>
  );
}
