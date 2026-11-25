import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { localDate } from '@/core/clock';
import { displayBranchTrail } from '@/core/rules/branch-path';
import { branchShadeForDepth, normalizeBranchColor } from '@/core/rules/branch-color';
import { weekDayOf } from '@/core/rules/week-review';
import {
  deriveOnboardingStep,
  needsOnboarding,
  shouldShowOnboarding,
} from '@/core/rules/onboarding-state';
import { reorderIds, type DragPosition } from '@/core/rules/drag-order';
import { groupTodayTasks, sortByManualOrder, type TodayGroupKey } from '@/core/rules/today-groups';
import { cancelTask } from '@/data/cancel-task';
import { completeTask } from '@/data/complete-task';
import { useOnboardingData, useTodayData, useStallReminders, useTodayDate } from '@/data/hooks';
import { planTask } from '@/data/plan-task';
import { reorderTasks } from '@/data/reorder';
import { updateCommit } from '@/data/update-commit';
import type { Commit, Task } from '@/data/types';
import { t, type MessageKey } from '@/i18n';
import { useOnboardingStore } from '@/stores/onboarding.store';
import { useReviewStore } from '@/stores/review.store';
import { useShellStore } from '@/stores/shell.store';
import { useTodayStore } from '@/stores/today.store';
import { ArrowIcon, ChevronDownIcon, ChevronRightIcon, PlusIcon, TodayIcon } from '@/ui/icons';
import { PageShell } from '@/ui/page-shell';
import { useIsCompact } from '@/ui/use-compact';
import { BranchTag } from '@/components/today/branch-tag';
import { CompletionReceipt } from '@/components/today/completion-receipt';
import { ConfirmDialog } from '@/components/today/confirm-dialog';
import { OnboardingCard } from '@/components/onboarding/onboarding-card';
import { readonlyReasonKey } from '@/components/today/readonly';
import { TaskRow } from '@/components/today/task-row';
import { WeekReviewCard } from '@/components/today/week-review-card';
import { MonthReviewPanel } from '@/components/today/month-review-panel';
import { ReviewReminder } from '@/components/today/review-reminder';
import styles from './today-page.module.css';

interface ReceiptState {
  taskTitle: string;
  commit: Commit;
  groupKey: TodayGroupKey;
  index: number;
}

const WEEKDAY_KEYS = [
  'today.date.weekday.1',
  'today.date.weekday.2',
  'today.date.weekday.3',
  'today.date.weekday.4',
  'today.date.weekday.5',
  'today.date.weekday.6',
  'today.date.weekday.7',
] as const;

const GROUP_KEYS: readonly TodayGroupKey[] = ['overdue', 'today', 'noDue'];

const GROUP_LABEL: Record<TodayGroupKey, MessageKey> = {
  overdue: 'today.group.overdue',
  today: 'today.group.today',
  noDue: 'today.group.noDue',
};

const GROUP_EMPTY: Record<TodayGroupKey, MessageKey> = {
  overdue: 'today.group.empty.overdue',
  today: 'today.group.empty.today',
  noDue: 'today.group.empty.noDue',
};

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

/** 页头的次要装饰：纸张与分支线；窄屏隐藏。 */
function HeroArt() {
  return (
    <svg
      className={styles.heroArt}
      viewBox="0 0 220 140"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M42 18h92a8 8 0 0 1 8 8v92a8 8 0 0 1-8 8H42a8 8 0 0 1-8-8V26a8 8 0 0 1 8-8Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M112 18v22h22" stroke="currentColor" strokeWidth="1.5" />
      <path d="M54 52h52M54 64h66M54 76h40" stroke="currentColor" strokeWidth="1.5" />
      <path d="M158 134V96a12 12 0 0 1 12-12h32" stroke="currentColor" strokeWidth="1.5" />
      <path d="M158 134V70a12 12 0 0 0-12-12h-16" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="170" cy="84" r="4" fill="currentColor" />
      <circle cx="130" cy="58" r="4" fill="currentColor" />
      <circle cx="158" cy="118" r="4" fill="currentColor" />
    </svg>
  );
}

/**
 * P01 今天（PRD M03）。
 *
 * 三组来自 R8 纯函数；完成走 `completeTask` 单事务，成功后原行位置显示回执；
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
  const onboardingStarted = useOnboardingStore((state) => state.started);
  const onboardingSkipped = useOnboardingStore((state) => state.skipped);
  const onboardingFinished = useOnboardingStore((state) => state.finished);
  const backfillPromptSeen = useOnboardingStore((state) => state.backfillPromptSeen);
  const dismissBackfillPrompt = useOnboardingStore((state) => state.dismissBackfillPrompt);
  const reopenOnboarding = useOnboardingStore((state) => state.reopen);
  const canReopen =
    onboarding.status === 'ready' && onboardingSkipped && needsOnboarding(onboarding.data);
  const showOnboarding =
    onboarding.status === 'ready' &&
    shouldShowOnboarding(
      { started: onboardingStarted, skipped: onboardingSkipped, finished: onboardingFinished },
      onboarding.data,
    );
  const onboardingStep = deriveOnboardingStep(onboarding.data);
  const showBackfillGuide =
    onboarding.status === 'ready' &&
    onboardingFinished &&
    !onboardingSkipped &&
    onboardingStep === 'done' &&
    onboarding.data.milestoneCount === 0 &&
    !backfillPromptSeen;
  const todayDate = useTodayDate();
  const stalls = useStallReminders(todayDate);
  const compact = useIsCompact();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptState | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Task | null>(null);
  const [groupOpen, setGroupOpen] = useState<Partial<Record<TodayGroupKey, boolean>>>({});
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
  const ready = data.status === 'ready';
  const firstTask = groups.overdue[0] ?? groups.today[0] ?? groups.noDue[0] ?? null;
  const firstGroupKey: TodayGroupKey | null = groups.overdue.length
    ? 'overdue'
    : groups.today.length
      ? 'today'
      : groups.noDue.length
        ? 'noDue'
        : null;

  const focusNext = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        listRef.current
          ?.querySelector<HTMLButtonElement>('[data-task-check]:not(:disabled)')
          ?.focus();
      });
    });
  };

  const complete = async (task: Task, groupKey: TodayGroupKey) => {
    if (busyId) return;
    const index = rowsOf(groupKey).findIndex((row) => row.id === task.id);
    setBusyId(task.id);
    setFailedId(null);
    const result = await completeTask({ taskId: task.id });
    setBusyId(null);
    if (result.ok) {
      setReceipt({ taskTitle: task.title, commit: result.value.commit, groupKey, index });
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

  const renderRow = (task: Task, groupKey: TodayGroupKey, index: number, rows: Task[]) => {
    const branch = byId.get(task.branchId);
    return (
      <TaskRow
        key={task.id}
        task={task}
        branch={branch}
        branchTrail={branch ? displayBranchTrail(branch, byId) : task.branchId}
        todayDate={todayDate}
        readonlyReason={trailing(task)}
        busy={busyId === task.id}
        error={failedId === task.id}
        onComplete={(row) => void complete(row, groupKey)}
        onOpen={(row) => openTaskDetail(row.id)}
        onPlan={(row) => void plan(row, todayDate)}
        onUnplan={(row) => void plan(row, null)}
        onCancel={setCancelTarget}
        canMoveUp={index > 0}
        canMoveDown={index >= 0 && index < rows.length - 1}
        onMoveUp={() => void moveTask(groupKey, task, -1)}
        onMoveDown={() => void moveTask(groupKey, task, 1)}
        dragEnabled={!compact && rows.length > 1 && !listCollapsed}
        dragging={dragging?.id === task.id}
        dropPosition={dropTarget?.id === task.id ? dropTarget.position : null}
        onDragStartTask={() => {
          setDragging({ id: task.id, group: groupKey });
          setDropTarget(null);
          setDragRejected(false);
        }}
        onDragOverTask={(target, position) => handleDragOver(groupKey, target, position)}
        onDropOnTask={(target) => void handleDrop(groupKey, target.id)}
        onDragEndTask={() => {
          setDragging(null);
          setDropTarget(null);
        }}
      />
    );
  };

  const receiptNode = receipt ? (
    <li key={`receipt-${receipt.commit.id}`} className={styles.receiptItem}>
      <CompletionReceipt
        commit={receipt.commit}
        taskTitle={receipt.taskTitle}
        onSaveNote={saveReceiptNote}
      />
    </li>
  ) : null;

  const renderGroup = (groupKey: TodayGroupKey, tasks: Task[]) => {
    const hasReceipt = receipt?.groupKey === groupKey;
    const defaultOpen = groupKey === 'today' || (groupKey === 'overdue' && tasks.length <= 5);
    const open = groupOpen[groupKey] ?? defaultOpen;
    const effectiveOpen = listCollapsed
      ? groupKey === firstGroupKey || hasReceipt
      : open || hasReceipt;
    // 全局收起状态由面板头部的“展开清单”控制，分组按钮在此状态下隐藏，
    // 避免出现点击后仍不会改变内容的无效控件。
    const showExpander = !listCollapsed && (tasks.length > 0 || hasReceipt);

    const nodes: ReactNode[] = [];
    tasks.forEach((task, index) => {
      if (hasReceipt && receipt && receipt.index === index) nodes.push(receiptNode);
      if (listCollapsed && task.id !== firstTask?.id) return;
      nodes.push(renderRow(task, groupKey, index, tasks));
    });
    if (hasReceipt && receipt && receipt.index >= tasks.length) nodes.push(receiptNode);

    return (
      <section className={styles.group} key={groupKey}>
        <div
          className={
            groupKey === 'today' ? `${styles.groupHead} ${styles.groupHeadToday}` : styles.groupHead
          }
        >
          <h3>
            <span>{t(GROUP_LABEL[groupKey])}</span>
            <span className={styles.count}>{tasks.length}</span>
          </h3>
          {showExpander ? (
            <button
              type="button"
              className={styles.expander}
              aria-expanded={effectiveOpen}
              onClick={() =>
                setGroupOpen((current) => ({ ...current, [groupKey]: !effectiveOpen }))
              }
            >
              {effectiveOpen ? t('today.group.collapse') : t('today.group.expand')}
              <ChevronDownIcon
                size={16}
                className={effectiveOpen ? styles.chevronOpen : styles.chevron}
              />
            </button>
          ) : null}
        </div>

        {effectiveOpen && nodes.length > 0 ? <ul className={styles.list}>{nodes}</ul> : null}
        {tasks.length === 0 && !hasReceipt ? (
          <p className={styles.groupEmpty}>{t(GROUP_EMPTY[groupKey])}</p>
        ) : null}
      </section>
    );
  };

  if (ready && showOnboarding) {
    return <OnboardingCard view={onboarding} step={onboardingStep} />;
  }

  const recentSection = (
    <section className={styles.recent} aria-label={t('today.recent.title')}>
      <div className={styles.recentHead}>
        <h2>{t('today.recent.title')}</h2>
        <Link className={styles.inlineLink} to="/history">
          {t('today.recent.view')}
          <ChevronRightIcon size={13} />
        </Link>
      </div>
      {data.commits.length === 0 ? (
        <p className={styles.blank}>{t('today.recent.empty')}</p>
      ) : (
        <ol className={styles.recentList}>
          {data.commits.map((commit) => {
            const branch = byId.get(commit.branchId);
            const color = branch ? normalizeBranchColor(branch.color) : 'sky';
            const shade = branch ? branchShadeForDepth(branch.depth) : 1;
            return (
              <li key={commit.id}>
                <button
                  type="button"
                  className={styles.recentItem}
                  style={{ '--node': `var(--${color}-${shade})` } as CSSProperties}
                  onClick={() => openCommitDetail(commit.id)}
                >
                  <span className={styles.node} aria-hidden="true" />
                  <span className={styles.commitCopy}>
                    <strong>{commit.summary}</strong>
                    {branch ? (
                      <BranchTag branch={branch} trail={displayBranchTrail(branch, byId)} />
                    ) : null}
                  </span>
                  <time>{monthDayLabel(localDate(commit.at))}</time>
                  <ChevronRightIcon size={16} className={styles.recentChevron} />
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );

  return (
    <PageShell
      eyebrow={
        <p className={styles.dateLine}>
          <TodayIcon size={16} />
          {dateLabelOf(todayDate)}
        </p>
      }
      title={
        <>
          <h1>{t('page.today.title')}</h1>
          {ready ? (
            <p className={styles.tally}>
              <span>
                <b>{groups.dueCount}</b>
                {t('today.header.dueSuffix')}
              </span>
              <span className={styles.tallyDot} aria-hidden="true" />
              <span>
                {t('today.header.noDuePrefix')}
                <b>{groups.noDueCount}</b>
                {t('today.header.noDueSuffix')}
              </span>
            </p>
          ) : null}
          {ready && total === 0 ? (
            <p className={styles.heroHint}>{t('today.hero.emptyHint')}</p>
          ) : null}
        </>
      }
      headClassName={styles.hero}
      headArt={<HeroArt />}
      action={
        <button
          type="button"
          className={styles.cta}
          disabled={!ready}
          aria-busy={data.status === 'loading'}
          onClick={() => openOverlay('quick-add')}
        >
          <PlusIcon size={18} />
          {t('page.today.action')}
        </button>
      }
    >
      {ready ? <ReviewReminder /> : null}

      {data.status === 'error' ? (
        <div className={styles.errorBar} role="alert">
          <p>{t('today.loadFailed')}</p>
          <button type="button" className={styles.retry} onClick={data.retry}>
            {t('today.retry')}
          </button>
        </div>
      ) : null}

      <div className={styles.layout}>
        <div className={styles.main} ref={listRef}>
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

          <section className={styles.panel} aria-label={t('today.list.title')}>
            <div className={styles.panelHead}>
              <div>
                <h2>{t('today.list.title')}</h2>
                <p>{t('today.list.subtitle')}</p>
              </div>
              {ready && total > 0 ? (
                <button
                  type="button"
                  className={styles.quiet}
                  onClick={toggleListCollapsed}
                  aria-pressed={listCollapsed}
                >
                  {listCollapsed ? t('today.list.expand') : t('today.list.collapse')}
                </button>
              ) : null}
            </div>

            {data.status === 'loading' ? (
              <>
                {GROUP_KEYS.map((key) => (
                  <div
                    key={key}
                    className={
                      key === 'today'
                        ? `${styles.groupHead} ${styles.groupHeadToday}`
                        : styles.groupHead
                    }
                  >
                    <h3>
                      <span>{t(GROUP_LABEL[key])}</span>
                      <span className={styles.count}>—</span>
                    </h3>
                  </div>
                ))}
                <div className={styles.skeletonRow} aria-hidden="true">
                  <span className={styles.skeletonCheck} />
                  <span className={styles.skeletonLine} />
                  <span className={styles.skeletonShort} />
                </div>
                <div className={styles.skeletonRow} aria-hidden="true">
                  <span className={styles.skeletonCheck} />
                  <span className={styles.skeletonLong} />
                  <span className={styles.skeletonShort} />
                </div>
              </>
            ) : null}

            {data.status === 'error' ? (
              <>
                {GROUP_KEYS.map((key) => (
                  <div key={key} className={styles.groupHead}>
                    <h3>
                      <span>{t(GROUP_LABEL[key])}</span>
                      <span className={styles.count}>—</span>
                    </h3>
                  </div>
                ))}
              </>
            ) : null}

            {ready ? (
              <>
                {renderGroup('overdue', groups.overdue)}
                {renderGroup('today', groups.today)}
                {renderGroup('noDue', groups.noDue)}
              </>
            ) : null}

            <div className={styles.panelFoot}>
              <span className={styles.footHint}>{t('today.list.footerHint')}</span>
              <Link className={styles.allLink} to="/today/all">
                {t('today.allLink')}
                <ArrowIcon size={16} />
              </Link>
            </div>
          </section>

          {ready && canReopen ? (
            <button type="button" className={styles.reopenLink} onClick={reopenOnboarding}>
              {t('onboarding.reopen')}
            </button>
          ) : null}
        </div>

        <aside className={styles.rail} aria-label={t('today.rail.label')}>
          {recentSection}

          {ready && stalls.length > 0 ? (
            <section className={styles.railCard} aria-label={t('today.stall.title')}>
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

          {ready ? <WeekReviewCard /> : null}
        </aside>
      </div>

      {ready && monthOpen ? <MonthReviewPanel /> : null}

      {ready && showBackfillGuide ? (
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
          onConfirm={() => void confirmCancel()}
          onClose={() => setCancelTarget(null)}
        />
      ) : null}
    </PageShell>
  );
}
