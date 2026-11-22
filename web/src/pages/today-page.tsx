import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { localClockTime, localDate, systemClock, today } from '@/core/clock';
import { isBranchAccepting } from '@/core/rules/branch-state';
import { visibleDefaultTree } from '@/core/rules/branch-visibility';
import { branchTrail, parseQuickAdd, resolveBranchQuery } from '@/core/rules/quick-add';
import { deriveOnboardingStep, needsOnboarding } from '@/core/rules/onboarding-state';
import { reorderIds, type DragPosition } from '@/core/rules/drag-order';
import { groupTodayTasks, sortByManualOrder, type TodayGroupKey } from '@/core/rules/today-groups';
import { weekDayOf } from '@/core/rules/week-review';
import { cancelTask } from '@/data/cancel-task';
import { completeTask } from '@/data/complete-task';
import { createTask } from '@/data/create-task';
import { useOnboardingData, useTodayData, useStallReminders } from '@/data/hooks';
import { planTask } from '@/data/plan-task';
import { reorderTasks } from '@/data/reorder';
import { updateCommit } from '@/data/update-commit';
import type { Branch, Commit, Task } from '@/data/types';
import { t, type MessageKey } from '@/i18n';
import { useOnboardingStore } from '@/stores/onboarding.store';
import { useReviewStore } from '@/stores/review.store';
import { useShellStore } from '@/stores/shell.store';
import { useTodayStore } from '@/stores/today.store';
import { EmptyState } from '@/ui/empty-state';
import { ArrowIcon, CheckIcon, ChevronRightIcon, PlusIcon } from '@/ui/icons';
import { LoadingShell } from '@/ui/loading-shell';
import { PageShell } from '@/ui/page-shell';
import { useIsCompact } from '@/ui/use-compact';
import { BranchTag } from '@/components/today/branch-tag';
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

const EMPTY_BRANCHES: readonly Branch[] = [];

const WEEKDAY_KEYS = [
  'today.date.weekday.1',
  'today.date.weekday.2',
  'today.date.weekday.3',
  'today.date.weekday.4',
  'today.date.weekday.5',
  'today.date.weekday.6',
  'today.date.weekday.7',
] as const;

/** 画稿页头：2026 年 11 月 20 日 · 周五。 */
function dateLabelOf(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return `${year}${t('milestone.date.yearSuffix')} ${month}${t('milestone.date.monthSuffix')} ${day}${t('milestone.date.daySuffix')}${t('today.date.separator')}${t(WEEKDAY_KEYS[weekDayOf(date) - 1]!)}`;
}

/** 右栏的短日期：11 月 20 日。 */
function monthDayLabel(date: string): string {
  const [, month, day] = date.split('-').map(Number);
  return `${month}${t('milestone.date.monthSuffix')} ${day}${t('milestone.date.daySuffix')}`;
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
  const [quickText, setQuickText] = useState('');
  const [quickBusy, setQuickBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const branches = data.status === 'ready' ? data.branches : EMPTY_BRANCHES;

  const accepting = useMemo(
    () =>
      visibleDefaultTree(branches)
        .filter(isBranchAccepting)
        .sort((a, b) => a.depth - b.depth || a.order - b.order),
    [branches],
  );

  const submitQuick = async () => {
    const parsed = parseQuickAdd(quickText, todayDate);
    if (!parsed.title.trim() || quickBusy) return;
    const matched = parsed.branchQuery ? resolveBranchQuery(accepting, parsed.branchQuery) : null;
    const branchId = matched?.id ?? accepting.find((branch) => branch.depth === 0)?.id;
    if (!branchId) {
      setPageError(t('today.quickAdd.failed'));
      return;
    }
    setQuickBusy(true);
    const result = await createTask({
      title: parsed.title,
      branchId,
      dueDate: parsed.dueDate ?? null,
    });
    setQuickBusy(false);
    if (result.ok) {
      setQuickText('');
      setPageError(null);
    } else {
      setPageError(t('today.quickAdd.failed'));
    }
  };

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
  const latestCommit = data.status === 'ready' ? (data.commits[0] ?? null) : null;

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

  const quickAddForm =
    data.status === 'ready' ? (
      <form
        className={styles.quickAdd}
        onSubmit={(event) => {
          event.preventDefault();
          void submitQuick();
        }}
      >
        <label className={styles.quickField}>
          <span className={styles.quickIcon} aria-hidden="true">
            <PlusIcon size={16} />
          </span>
          <input
            className={styles.quickInput}
            value={quickText}
            onChange={(event) => setQuickText(event.target.value)}
            placeholder={t('today.quickAdd.placeholder')}
            aria-label={t('today.quickAdd.label')}
            disabled={quickBusy}
          />
        </label>
        <button type="submit" className={styles.quickButton} disabled={quickBusy}>
          {t('today.quickAdd.submit')}
        </button>
      </form>
    ) : null;

  return (
    <PageShell
      eyebrow={<p className={styles.date}>{dateLabelOf(todayDate)}</p>}
      title={
        <>
          <h1>{t('page.today.title')}</h1>
          <p className={styles.description}>{t('page.today.body')}</p>
        </>
      }
      headClassName={styles.pageHead}
      action={
        data.status === 'ready' && total > 0 ? (
          <p className={styles.headSummary}>
            <strong>{groups.dueCount}</strong>
            {t('today.header.dueSuffix')}
            <span className={styles.headDot} aria-hidden="true" />
            {t('today.header.noDuePrefix')}
            <strong>{groups.noDueCount}</strong>
            {t('today.header.noDueSuffix')}
          </p>
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
        <div className={styles.main}>
          {quickAddForm}
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
        </div>
      ) : null}

      {data.status === 'ready' && total > 0 ? (
        <div className={styles.layout}>
          <div className={styles.main} ref={listRef}>
            {quickAddForm}

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
                      <span className={styles.groupLabel}>
                        <ChevronRightIcon className={styles.groupChevron} size={16} />
                        <span>{t('today.group.overdue')}</span>
                        <span className={styles.groupCount}>{groups.overdue.length}</span>
                      </span>
                    </summary>
                    <ul className={styles.list}>
                      {groups.overdue.map((task) => renderRow(task, 'overdue', groups.overdue))}
                    </ul>
                  </details>
                ) : null}

                {groups.today.length > 0 ? (
                  <details className={styles.group} open>
                    <summary className={styles.groupHead}>
                      <span className={styles.groupLabel}>
                        <ChevronRightIcon className={styles.groupChevron} size={16} />
                        <span>{t('today.group.today')}</span>
                        <span className={styles.groupCount}>{groups.today.length}</span>
                      </span>
                    </summary>
                    <ul className={styles.list}>
                      {groups.today.map((task) => renderRow(task, 'today', groups.today))}
                    </ul>
                  </details>
                ) : null}

                {groups.noDue.length > 0 ? (
                  <details className={styles.group}>
                    <summary className={styles.groupHead}>
                      <span className={styles.groupLabel}>
                        <ChevronRightIcon className={styles.groupChevron} size={16} />
                        <span>{t('today.group.noDue')}</span>
                        <span className={styles.groupCount}>{groups.noDue.length}</span>
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
              <ArrowIcon size={16} />
            </Link>
          </div>

          <aside className={styles.rail} aria-label={t('today.rail.label')}>
            {receipt ? (
              <CompletionReceipt
                key={receipt.commit.id}
                commit={receipt.commit}
                taskTitle={receipt.taskTitle}
                branch={byId.get(receipt.commit.branchId)}
                branchTrail={
                  byId.get(receipt.commit.branchId)
                    ? branchTrail(byId.get(receipt.commit.branchId)!, byId)
                    : receipt.commit.branchId
                }
                onSaveNote={saveReceiptNote}
              />
            ) : latestCommit ? (
              <section className={styles.receiptCard} aria-label={t('today.receipt.latest')}>
                <div className={styles.receiptHeading}>
                  <span className={styles.receiptCheck} aria-hidden="true">
                    <CheckIcon size={15} />
                  </span>
                  <span>{t('today.receipt.donePrefix')}</span>
                  <time className={styles.receiptTime}>{localClockTime(latestCommit.at)}</time>
                </div>
                <button
                  type="button"
                  className={styles.receiptTitle}
                  onClick={() => openCommitDetail(latestCommit.id)}
                >
                  {latestCommit.summary}
                </button>
                <div className={styles.receiptFoot}>
                  <BranchTag
                    branch={byId.get(latestCommit.branchId)}
                    trail={
                      byId.get(latestCommit.branchId)
                        ? branchTrail(byId.get(latestCommit.branchId)!, byId)
                        : latestCommit.branchId
                    }
                  />
                  <Link className={styles.receiptLink} to={`/history?commit=${latestCommit.id}`}>
                    {t('today.receipt.view')}
                    <ArrowIcon size={14} />
                  </Link>
                </div>
              </section>
            ) : (
              <section className={styles.railCard}>
                <p className={styles.railEmpty}>{t('today.receipt.empty')}</p>
              </section>
            )}

            <section
              className={`${styles.railCard} ${styles.railPanel}`}
              aria-label={t('today.recent.title')}
            >
              <div className={styles.panelTitle}>
                <h2>{t('today.recent.title')}</h2>
                <Link className={styles.inlineLink} to="/history">
                  {t('today.recent.view')}
                  <ChevronRightIcon size={13} />
                </Link>
              </div>
              {data.commits.length === 0 ? (
                <p className={styles.railEmpty}>{t('today.recent.empty')}</p>
              ) : (
                <ul className={styles.recentList}>
                  {data.commits.slice(0, 3).map((commit) => (
                    <li key={commit.id}>
                      <div>
                        <button
                          type="button"
                          className={styles.recentTitle}
                          onClick={() => openCommitDetail(commit.id)}
                        >
                          {commit.summary}
                        </button>
                        <BranchTag
                          branch={byId.get(commit.branchId)}
                          trail={
                            byId.get(commit.branchId)
                              ? branchTrail(byId.get(commit.branchId)!, byId)
                              : commit.branchId
                          }
                        />
                      </div>
                      <time>{monthDayLabel(localDate(commit.at))}</time>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {stalls.length > 0 ? (
              <section
                className={`${styles.railCard} ${styles.railPanel}`}
                aria-label={t('today.stall.title')}
              >
                <div className={styles.panelTitle}>
                  <h2>{t('today.stall.title')}</h2>
                  <span className={styles.count}>{stalls.length}</span>
                </div>
                <ul className={styles.stallList}>
                  {stalls.map((item) => (
                    <li key={item.branchId}>
                      <Link
                        className={styles.stallItem}
                        to={`/history?branch=${item.branchId}&date=${item.lastDate}`}
                      >
                        <i className={styles.stallDot} aria-hidden="true" />
                        <strong>{byId.get(item.branchId)?.title ?? item.branchId}</strong>
                        <span className={styles.stallDays}>
                          {t('today.stall.daysPrefix')}
                          {item.days}
                          {t('today.stall.daysSuffix')}
                        </span>
                        <ChevronRightIcon size={14} />
                      </Link>
                      <p className={styles.stallSince}>
                        {t('today.stall.lastPrefix')}
                        {monthDayLabel(item.lastDate)}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <WeekReviewCard />
          </aside>
        </div>
      ) : null}

      {data.status === 'ready' && total === 0 ? <WeekReviewCard /> : null}
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
