import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { currentTzOffset, systemClock, today } from '@/core/clock';
import {
  defaultMilestoneBranchId,
  milestoneTargetOptions,
  validateMilestoneDraft,
  type MilestoneTargetReason,
} from '@/core/rules/milestone-target';
import { branchTrail } from '@/core/rules/quick-add';
import { createMilestone, type CreateMilestonePrecision } from '@/data/create-milestone';
import { useBranchesView } from '@/data/hooks';
import type { Branch } from '@/data/types';
import { t, type MessageKey } from '@/i18n';
import { useHistoryFilterStore } from '@/stores/history.store';
import { useShellStore } from '@/stores/shell.store';
import { Dialog } from '@/ui/dialog';
import styles from './milestone-new-panel.module.css';

const REASON_KEYS: Record<Exclude<MilestoneTargetReason, null>, MessageKey> = {
  archived: 'milestone.form.branchReason.archived',
  merged: 'milestone.form.branchReason.merged',
  dropped: 'milestone.form.branchReason.dropped',
  deleted: 'milestone.form.branchReason.archived',
};

/**
 * S04 新建里程碑（M07 OP-01 / OP-03 / OP-04）。
 *
 * 所属分支默认来源页的分支（历程页取当前筛选），否则根分支；
 * 已归档、已合并、已放下的分支留在列表里但不可选，并写明原因。
 * 月精度只让用户选年月，保存时归一为当月 1 日。
 */
export function MilestoneNewPanel() {
  const closeOverlay = useShellStore((state) => state.closeOverlay);
  const setMilestoneFocus = useShellStore((state) => state.setMilestoneFocus);
  const preferredBranchId = useShellStore((state) => state.milestoneNewBranchId);
  const filterBranchId = useHistoryFilterStore((state) => state.filter.branchId);
  const view = useBranchesView();

  const tz = currentTzOffset(systemClock.now());
  const todayDate = today(systemClock, tz);

  const [title, setTitle] = useState('');
  const [precision, setPrecision] = useState<CreateMilestonePrecision>('day');
  const [dayValue, setDayValue] = useState(todayDate);
  const [monthValue, setMonthValue] = useState(todayDate.slice(0, 7));
  const [note, setNote] = useState('');
  const [branchId, setBranchId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const liveBranches = useMemo(
    () => view.branches.filter((branch) => branch.deletedAt === null),
    [view.branches],
  );
  const byId = useMemo(
    () => new Map<string, Branch>(liveBranches.map((branch) => [branch.id, branch])),
    [liveBranches],
  );
  const options = useMemo(() => milestoneTargetOptions(liveBranches), [liveBranches]);

  useEffect(() => {
    if (branchId !== null || view.status !== 'ready') return;
    setBranchId(defaultMilestoneBranchId(liveBranches, preferredBranchId ?? filterBranchId));
  }, [branchId, view.status, liveBranches, preferredBranchId, filterBranchId]);

  const dateValue = precision === 'day' ? dayValue : `${monthValue}-01`;
  const issues = validateMilestoneDraft({
    title,
    date: dateValue,
    precision,
    todayDate,
  });
  const titleIssue = issues.find((issue) => issue.field === 'title');
  const dateIssue = issues.find((issue) => issue.field === 'date');

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || issues.length > 0 || !branchId) return;

    setBusy(true);
    setSaveFailed(false);
    const result = await createMilestone({
      title,
      date: dateValue,
      precision,
      branchId,
      note,
    });
    setBusy(false);
    if (result.ok) {
      setMilestoneFocus(result.value.milestone.id);
      closeOverlay();
    } else {
      setSaveFailed(true);
    }
  };

  return (
    <Dialog
      bare
      as="form"
      onSubmit={save}
      onClose={closeOverlay}
      label={t('overlay.milestone-new.title')}
      backdropClassName={styles.backdrop}
      className={styles.panel}
    >
      <header className={styles.header}>
        <h2 className={styles.title}>{t('overlay.milestone-new.title')}</h2>
        <button type="button" className={styles.close} onClick={closeOverlay}>
          {t('shell.close')}
        </button>
      </header>

      {view.status === 'loading' ? (
        <p className={styles.state} role="status">
          {t('state.loading')}
        </p>
      ) : null}

      {view.status === 'error' ? (
        <div className={styles.errorBox} role="alert">
          <p>{t('milestone.form.loadFailed')}</p>
          <button type="button" className={styles.ghost} onClick={view.retry}>
            {t('milestone.form.retry')}
          </button>
        </div>
      ) : null}

      {view.status === 'ready' ? (
        <>
          <label className={styles.field}>
            <span className={styles.label}>{t('milestone.form.branch')}</span>
            <select
              className={styles.input}
              value={branchId ?? ''}
              onChange={(event) => setBranchId(event.target.value || null)}
            >
              {options.map(({ branch, reason }) => (
                <option key={branch.id} value={branch.id} disabled={reason !== null}>
                  {branchTrail(branch, byId)}
                  {reason === null ? '' : ` · ${t(REASON_KEYS[reason])}`}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>{t('milestone.form.title')}</span>
            <input
              className={styles.input}
              value={title}
              autoFocus
              placeholder={t('milestone.form.titlePlaceholder')}
              onChange={(event) => {
                setTitle(event.target.value);
                setSaveFailed(false);
              }}
            />
          </label>
          {titleIssue ? (
            <p className={styles.fieldError} role="alert">
              {t('milestone.form.error.title')}
            </p>
          ) : null}

          <fieldset className={styles.precision}>
            <legend className={styles.label}>{t('milestone.form.precision')}</legend>
            <div className={styles.precisionOptions}>
              <label className={styles.precisionOption}>
                <input
                  type="radio"
                  name="milestone-precision"
                  value="day"
                  checked={precision === 'day'}
                  onChange={() => setPrecision('day')}
                />
                <span>{t('milestone.form.precisionDay')}</span>
              </label>
              <label className={styles.precisionOption}>
                <input
                  type="radio"
                  name="milestone-precision"
                  value="month"
                  checked={precision === 'month'}
                  onChange={() => setPrecision('month')}
                />
                <span>{t('milestone.form.precisionMonth')}</span>
              </label>
            </div>
          </fieldset>

          {precision === 'day' ? (
            <label className={styles.field}>
              <span className={styles.label}>{t('milestone.form.date')}</span>
              <input
                type="date"
                className={styles.input}
                value={dayValue}
                max={todayDate}
                onChange={(event) => {
                  setDayValue(event.target.value);
                  setSaveFailed(false);
                }}
              />
            </label>
          ) : (
            <label className={styles.field}>
              <span className={styles.label}>{t('milestone.form.month')}</span>
              <input
                type="month"
                className={styles.input}
                value={monthValue}
                max={todayDate.slice(0, 7)}
                onChange={(event) => {
                  setMonthValue(event.target.value);
                  setSaveFailed(false);
                }}
              />
            </label>
          )}
          {dateIssue ? (
            <p className={styles.fieldError} role="alert">
              {t(
                dateIssue.reason === 'future'
                  ? 'milestone.form.error.future'
                  : 'milestone.form.error.date',
              )}
            </p>
          ) : null}

          <label className={styles.field}>
            <span className={styles.label}>{t('milestone.form.note')}</span>
            <textarea
              className={styles.textarea}
              value={note}
              rows={4}
              placeholder={t('milestone.form.notePlaceholder')}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>

          {saveFailed ? (
            <div className={styles.errorBox} role="alert">
              <p>{t('milestone.form.error.save')}</p>
              <button
                type="button"
                className={styles.ghost}
                onClick={() => {
                  setSaveFailed(false);
                  setBusy(false);
                }}
              >
                {t('milestone.form.retry')}
              </button>
            </div>
          ) : null}

          <div className={styles.actions}>
            <button
              type="submit"
              className={styles.save}
              disabled={busy || issues.length > 0 || !branchId}
            >
              {busy ? t('milestone.form.saving') : t('milestone.form.save')}
            </button>
          </div>
        </>
      ) : null}
    </Dialog>
  );
}
