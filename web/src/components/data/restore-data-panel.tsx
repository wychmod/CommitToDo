import { useEffect, useState, type ChangeEvent } from 'react';
import type { AppError } from '@/core/errors';
import { validateImportFile, type ImportFileData } from '@/core/rules/import-validate';
import { markBadgeBackfillSkipped } from '@/components/badges/backfill-guard';
import { importData } from '@/data/import-data';
import { t, type MessageKey } from '@/i18n';
import { useOnboardingStore } from '@/stores/onboarding.store';
import styles from './restore-data-panel.module.css';

const COUNT_KEYS: ReadonlyArray<{
  key: keyof ImportFileData['summary']['counts'];
  label: MessageKey;
}> = [
  { key: 'branches', label: 'data.overview.branches' },
  { key: 'tasks', label: 'data.overview.tasks' },
  { key: 'commits', label: 'data.overview.commits' },
  { key: 'milestones', label: 'data.overview.milestones' },
  { key: 'badges', label: 'data.overview.badges' },
];

function errorKey(error: AppError): MessageKey {
  if (error.code === 'backup.version_unsupported') return 'data.restore.error.version';
  if (error.field === 'schemaVersion') return 'data.restore.error.schemaVersion';
  if (error.field === 'data') return 'data.restore.error.shape';
  return 'data.restore.error.notJson';
}

function formatMoment(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

interface RestoreDataPanelProps {
  /** 本机是否已有业务数据；有数据时必须先导出一份副本。 */
  hasData: boolean;
  exportedInSession: boolean;
  onExport: () => Promise<boolean>;
  onClose: () => void;
}

/**
 * S08 从文件恢复（PRD M10 OP-03–OP-05、OP-07）。
 *
 * 选择文件后只做本地解析并展示摘要，不写库；本机有数据时必须先完成一次导出。
 * 确认后单事务整体替换，成功后重载到今天页；失败留在本页，现有数据不变。
 */
export function RestoreDataPanel({
  hasData,
  exportedInSession,
  onExport,
  onClose,
}: RestoreDataPanelProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [data, setData] = useState<ImportFileData | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [busy, onClose]);

  const blockedByExport = hasData && !exportedInSession;

  const pick = async (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    event.target.value = '';
    if (!picked) return;

    setFileName(picked.name);
    setText(null);
    setData(null);
    setError(null);
    setFailed(false);
    setReading(true);
    try {
      const content = await picked.text();
      const parsed = validateImportFile(content);
      if (!parsed.ok) {
        setError(errorKey(parsed.error));
        return;
      }
      setText(content);
      setData(parsed.value);
    } catch {
      setError('data.restore.error.notJson');
    } finally {
      setReading(false);
    }
  };

  const exportCurrent = async () => {
    if (exporting) return;
    setExporting(true);
    await onExport();
    setExporting(false);
  };

  const submit = async () => {
    if (!text || busy || blockedByExport) return;
    setBusy(true);
    setFailed(false);
    const result = await importData({ text });
    if (result.ok) {
      markBadgeBackfillSkipped();
      // 恢复出来的是真实数据，引导不再出现。
      useOnboardingStore.getState().finish();
      window.location.assign('/today');
      return;
    }
    setBusy(false);
    setFailed(true);
  };

  return (
    <div className={styles.backdrop} role="presentation" onClick={busy ? undefined : onClose}>
      <section
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={t('data.restore.title')}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.head}>
          <h2 className={styles.title}>{t('data.restore.title')}</h2>
          <button type="button" className={styles.close} onClick={onClose} disabled={busy}>
            {t('shell.close')}
          </button>
        </header>

        <p className={styles.hint}>{t('data.restore.hint')}</p>

        <label className={styles.pick}>
          {t('data.restore.action')}
          <input
            type="file"
            accept="application/json,.json"
            className={styles.fileInput}
            onChange={pick}
            disabled={busy || reading}
          />
        </label>

        {reading ? (
          <p className={styles.state} role="status">
            {t('data.restore.reading')}
          </p>
        ) : null}

        {error ? (
          <p className={styles.error} role="alert">
            {t(error)}
          </p>
        ) : null}

        {data ? (
          <div className={styles.summary}>
            <dl className={styles.meta}>
              <dt>{t('data.restore.file')}</dt>
              <dd>{fileName}</dd>
              <dt>{t('data.restore.exportedAt')}</dt>
              <dd>{formatMoment(data.summary.exportedAt)}</dd>
              <dt>{t('data.restore.schema')}</dt>
              <dd>{data.summary.schemaVersion}</dd>
            </dl>
            <p className={styles.countsTitle}>{t('data.restore.counts')}</p>
            <ul className={styles.counts}>
              {COUNT_KEYS.map((item) => (
                <li key={item.key}>
                  <span>{t(item.label)}</span>
                  <strong>{data.summary.counts[item.key]}</strong>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {data && blockedByExport ? (
          <div className={styles.gate}>
            <p>{t('data.restore.needExport')}</p>
            <button
              type="button"
              className={styles.ghost}
              onClick={exportCurrent}
              disabled={exporting || busy}
            >
              {exporting ? t('data.export.busy') : t('data.restore.exportFirst')}
            </button>
          </div>
        ) : null}

        {data && !blockedByExport ? (
          <div className={styles.warningBox}>
            <p>{t('data.restore.warning')}</p>
            {exportedInSession ? (
              <p className={styles.gateDone}>{t('data.restore.exported')}</p>
            ) : null}
          </div>
        ) : null}

        {failed ? (
          <p className={styles.error} role="alert">
            {t('data.restore.failed')}
          </p>
        ) : null}

        <footer className={styles.actions}>
          <button type="button" className={styles.ghost} onClick={onClose} disabled={busy}>
            {t('shell.cancel')}
          </button>
          {data ? (
            <button
              type="button"
              className={styles.primary}
              onClick={submit}
              disabled={busy || blockedByExport}
            >
              {busy ? t('data.restore.busy') : t('data.restore.confirm')}
            </button>
          ) : null}
        </footer>
      </section>
    </div>
  );
}
