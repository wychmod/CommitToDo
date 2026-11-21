import { useEffect, useState } from 'react';
import { clearAllData } from '@/data/clear-data';
import { t } from '@/i18n';
import styles from './clear-data-panel.module.css';

interface ClearDataPanelProps {
  hasData: boolean;
  exportedInSession: boolean;
  onExport: () => Promise<boolean>;
  onClose: () => void;
  onCleared: () => void;
}

/**
 * O05 清空本机数据（PRD M10 OP-06）。
 *
 * 两步确认：第一步说明范围与不可恢复并给「先导出」，第二步按钮为
 * 「清空并重新开始」。清空失败时数据保留，面板留在第二步可重试。
 */
export function ClearDataPanel({
  hasData,
  exportedInSession,
  onExport,
  onClose,
  onCleared,
}: ClearDataPanelProps) {
  const [step, setStep] = useState<1 | 2>(1);
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

  const exportCurrent = async () => {
    if (exporting) return;
    setExporting(true);
    await onExport();
    setExporting(false);
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    const result = await clearAllData();
    if (result.ok) {
      onCleared();
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
        aria-label={t('data.clear.title')}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.head}>
          <h2 className={styles.title}>{t('data.clear.title')}</h2>
          <button type="button" className={styles.close} onClick={onClose} disabled={busy}>
            {t('shell.close')}
          </button>
        </header>

        <div className={styles.warningBox}>
          <p>{t('data.clear.warning')}</p>
        </div>

        {step === 1 && hasData ? (
          <div className={styles.exportRow}>
            <button
              type="button"
              className={styles.ghost}
              onClick={exportCurrent}
              disabled={exporting || busy}
            >
              {exporting ? t('data.export.busy') : t('data.clear.exportFirst')}
            </button>
            {exportedInSession ? (
              <span className={styles.done}>{t('data.restore.exported')}</span>
            ) : null}
          </div>
        ) : null}

        {failed ? (
          <p className={styles.error} role="alert">
            {t('data.clear.failed')}
          </p>
        ) : null}

        <footer className={styles.actions}>
          {step === 2 ? (
            <button
              type="button"
              className={styles.ghost}
              onClick={() => setStep(1)}
              disabled={busy}
            >
              {t('shell.back')}
            </button>
          ) : (
            <button type="button" className={styles.ghost} onClick={onClose} disabled={busy}>
              {t('shell.cancel')}
            </button>
          )}
          {step === 1 ? (
            <button type="button" className={styles.dangerGhost} onClick={() => setStep(2)}>
              {t('data.clear.next')}
            </button>
          ) : (
            <button type="button" className={styles.danger} onClick={submit} disabled={busy}>
              {busy ? t('data.clear.busy') : t('data.clear.confirm')}
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}
