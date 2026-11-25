import { useState } from 'react';
import { Link } from 'react-router-dom';
import { localClockTime } from '@/core/clock';
import { composeCommitSummary } from '@/core/rules/commit-summary';
import type { Commit } from '@/data/types';
import { t } from '@/i18n';
import { CheckIcon } from '@/ui/icons';
import styles from './completion-receipt.module.css';

interface CompletionReceiptProps {
  commit: Commit;
  taskTitle: string;
  onSaveNote: (summary: string) => Promise<boolean>;
}

/**
 * 完成回执（P01 故事 2 / OP-03）。
 *
 * 勾选成功后出现在原行位置：「已提交 HH:mm」+ 补一句 + 查看提交。
 * 补一句只改提交文案，始终从待办标题重新拼接，不覆盖时间与日期。
 */
export function CompletionReceipt({ commit, taskTitle, onSaveNote }: CompletionReceiptProps) {
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
      setExtra('');
    } else {
      setError(true);
    }
  };

  const summary =
    savedExtra !== null ? composeCommitSummary(taskTitle, savedExtra) : commit.summary;

  return (
    <section className={styles.receipt} role="status" aria-label={t('today.receipt.title')}>
      <div className={styles.top}>
        <span className={styles.heading}>
          <span className={styles.check} aria-hidden="true">
            <CheckIcon size={14} />
          </span>
          {t('today.receipt.donePrefix')}
          <time className={styles.time}>{localClockTime(commit.at)}</time>
        </span>
        <Link className={styles.view} to={`/history?commit=${commit.id}`}>
          {t('today.receipt.view')}
        </Link>
      </div>

      <h2 className={styles.summary}>{summary}</h2>

      <div className={styles.noteForm}>
        <input
          className={styles.input}
          value={extra}
          placeholder={t('today.receipt.notePlaceholder')}
          aria-label={t('today.receipt.note')}
          disabled={busy}
          onChange={(event) => setExtra(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void save();
            }
          }}
        />
        <button type="button" className={styles.save} disabled={busy} onClick={() => void save()}>
          {busy ? t('today.receipt.saving') : t('today.receipt.save')}
        </button>
      </div>

      {savedExtra !== null ? (
        <p className={styles.saved} role="status">
          {t('today.receipt.saved')}
        </p>
      ) : null}

      {error ? (
        <p className={styles.error} role="alert">
          {t('today.writeFailed')}
        </p>
      ) : null}
    </section>
  );
}
