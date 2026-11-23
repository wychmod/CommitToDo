import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { currentTzOffset, systemClock, today } from '@/core/clock';
import { BACKFILL_MAX, validateBackfill, type BackfillDraftRow } from '@/core/rules/backfill';
import {
  defaultMilestoneBranchId,
  milestoneTargetOptions,
  type MilestoneTargetReason,
} from '@/core/rules/milestone-target';
import { branchTrail } from '@/core/rules/quick-add';
import { backfillMilestones } from '@/data/backfill-milestones';
import { useBranchesView } from '@/data/hooks';
import type { Branch } from '@/data/types';
import { t, type MessageKey } from '@/i18n';
import { useOnboardingStore } from '@/stores/onboarding.store';
import { useShellStore } from '@/stores/shell.store';
import { Dialog } from '@/ui/dialog';
import styles from './backfill-panel.module.css';

const REASON_KEYS: Record<Exclude<MilestoneTargetReason, null>, MessageKey> = {
  archived: 'milestone.form.branchReason.archived',
  merged: 'milestone.form.branchReason.merged',
  dropped: 'milestone.form.branchReason.dropped',
  deleted: 'milestone.form.branchReason.archived',
};

const EXAMPLES: MessageKey[] = [
  'backfill.example.graduation',
  'backfill.example.work',
  'backfill.example.move',
  'backfill.example.fitness',
];

interface DraftRow extends BackfillDraftRow {
  key: number;
}

/**
 * 补几件过去的事（PRD V1-07 A-04 / OP-05 / OP-06）。
 *
 * 1–5 行、标题与年月必填、月份不晚于当前月；保存后写入月精度里程碑，
 * 不生成提交也不改四计数。成功回到历程并定位到最早的一条。
 */
export function BackfillPanel() {
  const closeOverlay = useShellStore((state) => state.closeOverlay);
  const setMilestoneFocus = useShellStore((state) => state.setMilestoneFocus);
  const dismissBackfillPrompt = useOnboardingStore((state) => state.dismissBackfillPrompt);
  const navigate = useNavigate();
  const view = useBranchesView();

  const tz = currentTzOffset(systemClock.now());
  const todayDate = today(systemClock, tz);
  const currentMonth = todayDate.slice(0, 7);

  const [rows, setRows] = useState<DraftRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const nextKey = useMemo(() => ({ value: 1 }), []);

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
    if (view.status !== 'ready' || rows.length > 0) return;
    const rootId = defaultMilestoneBranchId(liveBranches, null);
    if (!rootId) return;
    setRows([{ key: nextKey.value++, title: '', month: '', branchId: rootId }]);
  }, [view.status, rows.length, liveBranches, nextKey]);

  const validation = useMemo(
    () => validateBackfill(rows, liveBranches, todayDate),
    [rows, liveBranches, todayDate],
  );
  const issueFor = (index: number, field: 'title' | 'month' | 'branch') =>
    validation.issues.find((issue) => issue.index === index && issue.field === field);

  const closeAll = () => {
    dismissBackfillPrompt();
    closeOverlay();
  };

  const updateRow = (key: number, patch: Partial<BackfillDraftRow>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    setSaveFailed(false);
  };

  const addRow = (title = '') => {
    setSaveFailed(false);
    setRows((current) => {
      if (current.length >= BACKFILL_MAX) return current;
      const empty = current.find((row) => row.title.trim() === '');
      if (title && empty) {
        return current.map((row) => (row.key === empty.key ? { ...row, title } : row));
      }
      const rootId = defaultMilestoneBranchId(liveBranches, null);
      return [...current, { key: nextKey.value++, title, month: '', branchId: rootId }];
    });
  };

  const addExample = (key: MessageKey) => {
    const title = t(key);
    setSaveFailed(false);
    setRows((current) => {
      if (current.length >= BACKFILL_MAX) return current;
      const empty = current.find((row) => row.title.trim() === '');
      if (empty) {
        return current.map((row) => (row.key === empty.key ? { ...row, title } : row));
      }
      const rootId = defaultMilestoneBranchId(liveBranches, null);
      return [...current, { key: nextKey.value++, title, month: '', branchId: rootId }];
    });
  };

  const removeRow = (key: number) => {
    setSaveFailed(false);
    setRows((current) =>
      current.length <= 1 ? current : current.filter((row) => row.key !== key),
    );
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !validation.canSave) return;

    setBusy(true);
    setSaveFailed(false);
    const result = await backfillMilestones({
      rows: validation.entries.map((entry) => ({
        title: entry.title,
        month: entry.month,
        branchId: entry.branchId,
      })),
    });
    setBusy(false);

    if (result.ok) {
      dismissBackfillPrompt();
      setMilestoneFocus(result.value.earliest?.id ?? null);
      closeOverlay();
      navigate('/history');
    } else {
      setSaveFailed(true);
    }
  };

  const clearFailure = () => {
    setSaveFailed(false);
    setBusy(false);
  };

  return (
    <Dialog
      bare
      as="form"
      onSubmit={save}
      onClose={closeAll}
      busy={busy}
      label={t('overlay.backfill.title')}
      backdropClassName={styles.backdrop}
      className={styles.panel}
    >
      <header className={styles.header}>
        <h2 className={styles.title}>{t('overlay.backfill.title')}</h2>
        <button type="button" className={styles.close} onClick={closeAll}>
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
          <p>{t('backfill.loadFailed')}</p>
          <button type="button" className={styles.ghost} onClick={view.retry}>
            {t('backfill.retry')}
          </button>
        </div>
      ) : null}

      {view.status === 'ready' ? (
        <>
          <p className={styles.intro}>{t('backfill.intro')}</p>

          <div className={styles.examples}>
            <span className={styles.examplesLabel}>{t('backfill.examples')}</span>
            <div className={styles.chips}>
              {EXAMPLES.map((key) => (
                <button
                  key={key}
                  type="button"
                  className={styles.chip}
                  onClick={() => addExample(key)}
                  disabled={rows.length >= BACKFILL_MAX}
                >
                  {t(key)}
                </button>
              ))}
            </div>
          </div>

          <ol className={styles.rows}>
            {rows.map((row, index) => {
              const dirty = row.title.trim() !== '' || row.month !== '';
              const titleIssue = dirty ? issueFor(index, 'title') : undefined;
              const monthIssue = issueFor(index, 'month');
              const branchIssue = issueFor(index, 'branch');
              return (
                <li key={row.key} className={styles.row}>
                  <div className={styles.rowHead}>
                    <span className={styles.rowIndex}>{index + 1}</span>
                    <button
                      type="button"
                      className={styles.remove}
                      onClick={() => removeRow(row.key)}
                      disabled={rows.length <= 1}
                    >
                      {t('backfill.remove')}
                    </button>
                  </div>

                  <label className={styles.field}>
                    <span className={styles.label}>{t('backfill.field.title')}</span>
                    <input
                      className={styles.input}
                      value={row.title}
                      autoFocus={index === 0}
                      placeholder={t('backfill.field.titlePlaceholder')}
                      onChange={(event) => updateRow(row.key, { title: event.target.value })}
                    />
                  </label>
                  {titleIssue ? (
                    <p className={styles.fieldError} role="alert">
                      {t('backfill.error.title')}
                    </p>
                  ) : null}

                  <div className={styles.pair}>
                    <label className={styles.field}>
                      <span className={styles.label}>{t('backfill.field.month')}</span>
                      <input
                        type="month"
                        className={styles.input}
                        value={row.month}
                        max={currentMonth}
                        onChange={(event) => updateRow(row.key, { month: event.target.value })}
                      />
                    </label>

                    <label className={styles.field}>
                      <span className={styles.label}>{t('backfill.field.branch')}</span>
                      <select
                        className={styles.input}
                        value={row.branchId ?? ''}
                        onChange={(event) =>
                          updateRow(row.key, { branchId: event.target.value || null })
                        }
                      >
                        {options.map(({ branch, reason }) => (
                          <option key={branch.id} value={branch.id} disabled={reason !== null}>
                            {branchTrail(branch, byId)}
                            {reason === null ? '' : ` · ${t(REASON_KEYS[reason])}`}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {monthIssue || branchIssue ? (
                    <p className={styles.fieldError} role="alert">
                      {t(
                        monthIssue?.reason === 'future'
                          ? 'backfill.error.future'
                          : monthIssue
                            ? 'backfill.error.month'
                            : 'backfill.error.branch',
                      )}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>

          <div className={styles.addRow}>
            <button
              type="button"
              className={styles.ghost}
              onClick={() => addRow()}
              disabled={rows.length >= BACKFILL_MAX}
            >
              {t('backfill.add')}
            </button>
            <span className={styles.limit}>{t('backfill.limit')}</span>
          </div>

          {saveFailed ? (
            <div className={styles.errorBox} role="alert">
              <p>{t('backfill.error.save')}</p>
              <button type="button" className={styles.ghost} onClick={clearFailure}>
                {t('milestone.form.retry')}
              </button>
            </div>
          ) : null}

          <div className={styles.actions}>
            <button type="button" className={styles.ghost} onClick={closeAll}>
              {t('backfill.later')}
            </button>
            <button type="submit" className={styles.save} disabled={busy || !validation.canSave}>
              {busy
                ? t('backfill.saving')
                : `${t('backfill.savePrefix')}${rows.length}${t('backfill.saveSuffix')}`}
            </button>
          </div>
        </>
      ) : null}
    </Dialog>
  );
}
