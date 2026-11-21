import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { localClockTime, localDate, systemClock, today } from '@/core/clock';
import { branchTrail } from '@/core/rules/quick-add';
import { deriveOnboardingStep, needsOnboarding } from '@/core/rules/onboarding-state';
import { reorderIds, type DragPosition } from '@/core/rules/drag-order';
import { groupTodayTasks, sortByManualOrder, type TodayGroupKey } from '@/core/rules/today-groups';
import { cancelTask } from '@/data/cancel-task';
import { completeTask } from '@/data/complete-task';
import { useOnboardingData, useTodayData, useStallReminders } from '@/data/hooks';
import { planTask } from '@/data/plan-task';
import { reorderTasks } from '@/data/reorder';
import { updateCommit } from '@/data/update-commit';
import type { Commit, Task } from '@/data/types';
import { t, type MessageKey } from '@/i18n';
import { useOnboardingStore } from '@/stores/onboarding.store';
import { useReviewStore } from '@/stores/review.store';
import { useShellStore } from '@/stores/shell.store';
import { useTodayStore } from '@/stores/today.store';
import { EmptyState } from '@/ui/empty-state';
import { LoadingShell } from '@/ui/loading-shell';
import { PageShell } from '@/ui/page-shell';
import { useIsCompact } from '@/ui/use-compact';
import { CompletionReceipt } from '@/components/today/completion-receipt';
import { ConfirmDialog } from '@/components/today/confirm-dialog';
import { OnboardingCard } from '@/components/onboarding/onboarding-card';
import { readonlyReasonKey } from '@/components/today/readonly';
import { TaskRow } from '@/components/today/task-row';
import { BadgeToast } from '@/components/today/badge-toast';
import { WeekReviewCard } from '@/components/today/week-review-card';
import { MonthReviewPanel } from '@/components/today/month-review-panel';
import { ReviewReminder } from '@/components/today/review-reminder';
import styles from './today-page.module.css';

interface ReceiptState {
  taskTitle: string;
  commit: Commit;
}

/**
 * P01 今天（PRD M03）。
 *
 * 三组来自 R8 纯函数；完成走 `completeTask` 单事务，成功后行位置显示回执；
 * 收起清单是纯 UI 状态，完成后自动露出下一条。
 */
export function TodayPage() {
  const data = useTodayData();
  const monthOpen = useReviewStore((state) => state.monthOpen);
  const openOverlay = useShellStore((state) => state.openOverlay);
  const openTaskDetail = useShellStore((state) => state.openTaskDetail);
  const openCommitDetail = useShellStore((state) => state.openCommitDetail);
  const listCollapsed = useTodayStore((state) => state.listCollapsed);
  const toggleListCollapsed = useTodayStore((state) => state.toggleListCollapsed);
  const manualGroups = useTodayStore((state) => state.manualGroups);
  const markManualGroup = useTodayStore((state) => state.markManualGroup);
  const onboarding = useOnboardingData();
  const onboardingSkipped = useOnboardingStore((state) => state.skipped);
  const onboardingFinished = useOnboardingStore((state) => state.finished);
  const backfillPromptSeen = useOnboardingStore((state) => state.backfillPromptSeen);
  const dismissBackfillPrompt = useOnboardingStore((state) => state.dismissBackfillPrompt);
  const reopenOnboarding = useOnboardingStore((state) => state.reopen);
  const canReopen =
    onboarding.status === 'ready' && onboardingSkipped && needsOnboarding(onboarding.data);
  const showBackfillGuide =
    onboarding.status === 'ready' &&
    onboardingFinished &&
    !onboardingSkipped &&
    deriveOnboardingStep(onboarding.data) === 'done' &&
    onboarding.data.milestoneCount === 0 &&
    !backfillPromptSeen;
  const todayDate = today(systemClock);
  const stalls = useStallReminders(todayDate);
  const compact = useIsCompact();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptState | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Task | null>(null);
  const [dragging, setDragging] = useState<{ id: string; group: TodayGroupKey } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: DragPosition } | null>(null);
  const [dragRejected, setDragRejected] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dragRejected) return;
    const timer = window.setTimeout(() => setDragRejected(false), 2400);
    return () => window.clearTimeout(timer);
  }, [dragRejected]);

  const groups = useMemo(() => {
    const base = groupTodayTasks(data.tasks, data.branches, todayDate);
    return {
      ...base,
      overdue: manualGroups.overdue ? sortByManualOrder(base.overdue) : base.overdue,
      today: manualGroups.today ? sortByManualOrder(base.today) : base.today,
      noDue: manualGroups.noDue ? sortByManualOrder(base.noDue) : base.noDue,
    };
  }, [data.tasks, data.branches, todayDate, manualGroups]);
  const byId = useMemo(
    () => new Map(data.branches.map((branch) => [branch.id, branch])),
    [data.branches],
  );

  const total = groups.overdue.length + groups.today.length + groups.noDue.length;
  const flattened = [...groups.overdue, ...groups.today, ...groups.noDue];

  const focusNext = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        listRef.current
          ?.querySelector<HTMLButtonElement>('[data-task-check]:not(:disabled)')
          ?.focus();
      });
    });
  };

  const complete = async (task: Task) => {
    if (busyId) return;
    setBusyId(task.id);
    setFailedId(null);
    const result = await completeTask({ taskId: task.id });
    setBusyId(null);
    if (result.ok) {
      setReceipt({ taskTitle: task.title, commit: result.value.commit });
      setPageError(null);
      focusNext();
    } else {
      setFailedId(task.id);
    }
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

  const saveReceiptNote = async (summary: string): Promise<boolean> => {
    if (!receipt) return false;
    const result = await updateCommit({ commitId: receipt.commit.id, summary });
    if (result.ok) {
      setReceipt({ ...receipt, commit: result.value });
      return true;
    }
    return false;
  };

  const trailing = (task: Task): MessageKey | null => readonlyReasonKey(byId.get(task.branchId));

  const rowsOf = (groupKey: TodayGroupKey): Task[] => {
    if (groupKey === 'overdue') return groups.overdue;
    if (groupKey === 'today') return groups.today;
    return groups.noDue;
  };

  const commitOrder = async (groupKey: TodayGroupKey, orderedIds: string[]) => {
    const result = await reorderTasks({ groupKey, orderedIds, todayDate });
    if (result.ok) markManualGroup(groupKey);
    else setPageError(t('today.order.failed'));
  };

  const moveTask = async (groupKey: TodayGroupKey, task: Task, delta: number) => {
    const rows = rowsOf(groupKey);
    const index = rows.findIndex((row) => row.id === task.id);
    const next = index + delta;
    if (index < 0 || next < 0 || next >= rows.length) return;
    const ids = rows.map((row) => row.id);
    [ids[index], ids[next]] = [ids[next]!, ids[index]!];
    await commitOrder(groupKey, ids);
  };

  const handleDragOver = (groupKey: TodayGroupKey, task: Task, position: DragPosition) => {
    if (!dragging) return;
    if (dragging.group !== groupKey) {
      setDragRejected(true);
      setDropTarget(null);
      return;
    }
    setDragRejected(false);
    setDropTarget({ id: task.id, position });
  };

  const handleDrop = async (groupKey: TodayGroupKey, targetId: string) => {
    const source = dragging;
    const target = dropTarget;
    setDragging(null);
    setDropTarget(null);
    if (!source) return;
    if (source.group !== groupKey || !target) {
      setDragRejected(true);
      return;
    }

    const result = reorderIds(
      rowsOf(groupKey).map((row) => row.id),
      source.id,
      targetId,
      target.position,
      { group: groupKey },
      { group: groupKey },
    );
    if (!result.ok) {
      setDragRejected(true);
      return;
    }
    if (!result.changed) return;
    await commitOrder(groupKey, result.ids);
  };

  const renderRow = (task: Task, groupKey: TodayGroupKey, rows: Task[]) => {
    const branch = byId.get(task.branchId);
    const index = rows.findIndex((row) => row.id === task.id);
    return (
      <TaskRow
        key={task.id}
        task={task}
        branch={branch}
        branchTrail={branch ? branchTrail(branch, byId) : task.branchId}
        todayDate={todayDate}
        readonlyReason={trailing(task)}
        busy={busyId === task.id}
        error={failedId === task.id}
        onComplete={complete}
        onOpen={(row) => openTaskDetail(row.id)}
        onPlan={(row) => plan(row, todayDate)}
        onUnplan={(row) => plan(row, null)}
        onCancel={setCancelTarget}
        canMoveUp={index > 0}
        canMoveDown={index >= 0 && index < rows.length - 1}
        onMoveUp={() => moveTask(groupKey, task, -1)}
        onMoveDown={() => moveTask(groupKey, task, 1)}
        dragEnabled={!compact && rows.length > 1}
        dragging={dragging?.id === task.id}
        dropPosition={dropTarget?.id === task.id ? dropTarget.position : null}
        onDragStartTask={() => {
          setDragging({ id: task.id, group: groupKey });
          setDropTarget(null);
          setDragRejected(false);
        }}
        onDragOverTask={(target, position) => handleDragOver(groupKey, target, position)}
        onDropOnTask={(target) => handleDrop(groupKey, target.id)}
        onDragEndTask={() => {
          setDragging(null);
          setDropTarget(null);
        }}
      />
    );
  };

  return (
    <PageShell
      titleKey="page.today.title"
      bodyKey="page.today.body"
      action={
        total > 0 ? (
          <button type="button" className={styles.action} onClick={() => openOverlay('quick-add')}>
            {t('page.today.action')}
          </button>
        ) : undefined
      }
    >
      {data.status === 'loading' ? <LoadingShell /> : null}

      {data.status === 'error' ? (
        <div className={styles.errorBox} role="alert">
          <p>{t('today.loadFailed')}</p>
          <button type="button" className={styles.retry} onClick={data.retry}>
            {t('today.retry')}
          </button>
        </div>
      ) : null}

      {data.status === 'ready' ? <ReviewReminder /> : null}
      {data.status === 'ready' ? <OnboardingCard /> : null}

      {data.status === 'ready' && total === 0 ? (
        <EmptyState
          messageKey="page.today.empty"
          action={
            <div className={styles.emptyActions}>
              <button
                type="button"
                className={styles.action}
                onClick={() => openOverlay('quick-add')}
              >
                {t('page.today.action')}
              </button>
              {canReopen ? (
                <button type="button" className={styles.reopenLink} onClick={reopenOnboarding}>
                  {t('onboarding.reopen')}
                </button>
              ) : null}
            </div>
          }
        />
      ) : null}

      {data.status === 'ready' && total > 0 ? (
        <div className={styles.layout}>
          <div className={styles.main} ref={listRef}>
            <p className={styles.summary}>
              {groups.dueCount}
              {t('today.header.dueSuffix')}
              {t('today.header.separator')}
              {t('today.header.noDuePrefix')}
              {groups.noDueCount}
              {t('today.header.noDueSuffix')}
            </p>

            {receipt ? (
              <CompletionReceipt
                key={receipt.commit.id}
                commit={receipt.commit}
                taskTitle={receipt.taskTitle}
                onOpenCommit={() => openCommitDetail(receipt.commit.id)}
                onSaveNote={saveReceiptNote}
              />
            ) : null}

            {pageError ? (
              <p className={styles.inlineError} role="alert">
                {pageError}
              </p>
            ) : null}

            {dragRejected ? (
              <p className={styles.inlineError} role="alert">
                {t('today.order.crossGroup')}
              </p>
            ) : null}

            {listCollapsed ? (
              <section className={styles.group}>
                <div className={styles.groupHead}>
                  <h2 className={styles.groupTitle}>{t('today.list.collapsedHint')}</h2>
                  <button
                    type="button"
                    className={styles.collapseButton}
                    onClick={toggleListCollapsed}
                  >
                    {t('today.list.expand')}
                  </button>
                </div>
                <ul className={styles.list}>
                  {renderRow(
                    flattened[0]!,
                    groups.overdue.length > 0
                      ? 'overdue'
                      : groups.today.length > 0
                        ? 'today'
                        : 'noDue',
                    flattened.slice(0, 1),
                  )}
                </ul>
              </section>
            ) : (
              <>
                {groups.overdue.length > 0 ? (
                  <details className={styles.group} open={groups.overdue.length <= 5}>
                    <summary className={styles.groupHead}>
                      <h2 className={styles.groupTitle}>{t('today.group.overdue')}</h2>
                      <span className={styles.groupCount}>
                        {groups.overdue.length}
                        {t('today.group.countSuffix')}
                      </span>
                    </summary>
                    <ul className={styles.list}>
                      {groups.overdue.map((task) => renderRow(task, 'overdue', groups.overdue))}
                    </ul>
                  </details>
                ) : null}

                {groups.today.length > 0 ? (
                  <section className={styles.group}>
                    <div className={styles.groupHead}>
                      <h2 className={styles.groupTitle}>{t('today.group.today')}</h2>
                      <span className={styles.groupCount}>
                        {groups.today.length}
                        {t('today.group.countSuffix')}
                      </span>
                    </div>
                    <ul className={styles.list}>
                      {groups.today.map((task) => renderRow(task, 'today', groups.today))}
                    </ul>
                  </section>
                ) : null}

                {groups.noDue.length > 0 ? (
                  <details className={styles.group}>
                    <summary className={styles.groupHead}>
                      <h2 className={styles.groupTitle}>{t('today.group.noDue')}</h2>
                      <span className={styles.groupCount}>
                        {groups.noDue.length}
                        {t('today.group.countSuffix')}
                      </span>
                    </summary>
                    <ul className={styles.list}>
                      {groups.noDue.map((task) => renderRow(task, 'noDue', groups.noDue))}
                    </ul>
                  </details>
                ) : null}

                <div className={styles.listFooter}>
                  <button
                    type="button"
                    className={styles.collapseButton}
                    onClick={toggleListCollapsed}
                  >
                    {t('today.list.collapse')}
                  </button>
                </div>
              </>
            )}

            <Link className={styles.allLink} to="/today/all">
              {t('today.allLink')}
            </Link>
          </div>

          <aside className={styles.rail} aria-label={t('today.recent.title')}>
            {stalls.length > 0 ? (
              <section className={styles.stallBlock} aria-label={t('today.stall.title')}>
                <h2 className={styles.railTitle}>{t('today.stall.title')}</h2>
                <ul className={styles.stallList}>
                  {stalls.map((item) => (
                    <li key={item.branchId}>
                      <Link
                        className={styles.stallItem}
                        to={`/history?branch=${item.branchId}&date=${item.lastDate}`}
                      >
                        <span className={styles.stallName}>
                          {byId.get(item.branchId)?.title ?? item.branchId}
                        </span>
                        <span className={styles.stallMeta}>
                          {t('today.stall.daysPrefix')}
                          {item.days}
                          {t('today.stall.daysSuffix')}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <h2 className={styles.railTitle}>{t('today.recent.title')}</h2>
            {data.commits.length === 0 ? (
              <p className={styles.railEmpty}>{t('today.recent.empty')}</p>
            ) : (
              <ul className={styles.commitList}>
                {data.commits.map((commit) => {
                  const branch = byId.get(commit.branchId);
                  return (
                    <li key={commit.id}>
                      <button
                        type="button"
                        className={styles.commit}
                        onClick={() => openCommitDetail(commit.id)}
                      >
                        <span className={styles.commitSummary}>{commit.summary}</span>
                        <span className={styles.commitMeta}>
                          {branch ? branchTrail(branch, byId) : commit.branchId}
                          {t('today.recent.separator')}
                          {localDate(commit.at).slice(5)} {localClockTime(commit.at)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>
        </div>
      ) : null}

      {data.status === 'ready' ? <WeekReviewCard /> : null}
      {data.status === 'ready' && monthOpen ? <MonthReviewPanel /> : null}
      {data.status === 'ready' ? <BadgeToast /> : null}

      {data.status === 'ready' && showBackfillGuide ? (
        <section className={styles.backfillCard} aria-labelledby="backfill-guide-title">
          <div className={styles.backfillCopy}>
            <h2 id="backfill-guide-title" className={styles.backfillTitle}>
              {t('backfill.guide.title')}
            </h2>
            <p className={styles.backfillBody}>{t('backfill.guide.body')}</p>
          </div>
          <div className={styles.backfillActions}>
            <button
              type="button"
              className={styles.backfillGo}
              onClick={() => {
                dismissBackfillPrompt();
                openOverlay('backfill');
              }}
            >
              {t('backfill.guide.action')}
            </button>
            <button type="button" className={styles.backfillLater} onClick={dismissBackfillPrompt}>
              {t('backfill.guide.later')}
            </button>
          </div>
        </section>
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
