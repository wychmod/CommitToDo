import { useState } from 'react';
import { Link } from 'react-router-dom';
import { localClockTime } from '@/core/clock';
import { composeCommitSummary } from '@/core/rules/commit-summary';
import type { Branch, Commit } from '@/data/types';
import { t } from '@/i18n';
import { ArrowIcon, CheckIcon } from '@/ui/icons';
import { BranchTag } from './branch-tag';
import styles from './completion-receipt.module.css';

interface CompletionReceiptProps {
  commit: Commit;
  taskTitle: string;
  branch: Branch | undefined;
  branchTrail: string;
  onSaveNote: (summary: string) => Promise<boolean>;
}

/**
 * 完成回执（P01 故事 2 / OP-03）。
 *
 * 勾选成功后立刻出现「已提交 HH:mm」；补一句只改提交文案，
 * 始终从待办标题重新拼接，不覆盖时间与日期。
 */
export function CompletionReceipt({
  commit,
  taskTitle,
  branch,
  branchTrail,
  onSaveNote,
}: CompletionReceiptProps) {
  const [open, setOpen] = useState(false);
  const [extra, setExtra] = useState('');
  const [savedExtra, setSavedExtra] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const save = async () => {
    if (busy) return;
    setBusy(true);
    setError(false);
    const ok = await onSaveNote(composeCommitSummary(taskTitle, extra));
    setBusy(false);
    if (ok) {
      setSavedExtra(extra.trim() || null);
      setOpen(false);
    } else {
      setError(true);
    }
  };

  const hasNote = savedExtra !== null;
  const summary = hasNote ? composeCommitSummary(taskTitle, savedExtra) : commit.summary;

  return (
    <section className={styles.receipt} role="status" aria-label={t('today.receipt.title')}>
      <div className={styles.heading}>
        <span className={styles.check} aria-hidden="true">
          <CheckIcon size={15} />
        </span>
        <span>{t('today.receipt.donePrefix')}</span>
        <time className={styles.time}>{localClockTime(commit.at)}</time>
      </div>

      <h2 className={styles.title}>{summary}</h2>

      <div className={styles.foot}>
        <BranchTag branch={branch} trail={branchTrail} />
        <div className={styles.links}>
          <button type="button" className={styles.noteLink} onClick={() => setOpen(true)}>
            {hasNote ? t('today.receipt.saved') : t('today.receipt.note')}
          </button>
          <Link className={styles.view} to={`/history?commit=${commit.id}`}>
            {t('today.receipt.view')}
            <ArrowIcon size={14} />
          </Link>
        </div>
      </div>

      {open ? (
        <div className={styles.noteForm}>
          <label className={styles.noteLabel} htmlFor={`receipt-note-${commit.id}`}>
            {t('today.receipt.note')}
          </label>
          <input
            id={`receipt-note-${commit.id}`}
            className={styles.input}
            value={extra}
            placeholder={t('today.receipt.notePlaceholder')}
            disabled={busy}
            onChange={(event) => setExtra(event.target.value)}
          />
          <button type="button" className={styles.save} disabled={busy} onClick={save}>
            {busy ? t('today.receipt.saving') : t('today.receipt.save')}
          </button>
          {error ? (
            <p className={styles.error} role="alert">
              {t('today.writeFailed')}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
