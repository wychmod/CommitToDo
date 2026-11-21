import { useEffect, useRef } from 'react';
import { t, type MessageKey } from '@/i18n';
import styles from './confirm-dialog.module.css';

interface ConfirmDialogProps {
  titleKey: MessageKey;
  bodyKey: MessageKey;
  confirmKey: MessageKey;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** 一次确认的小弹层；取消待办等不可逆动作必须经过它。 */
export function ConfirmDialog({
  titleKey,
  bodyKey,
  confirmKey,
  busy = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [busy, onClose]);

  return (
    <div className={styles.backdrop} role="presentation" onPointerDown={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <h2 className={styles.title} id="confirm-title">
          {t(titleKey)}
        </h2>
        <p className={styles.body}>{t(bodyKey)}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.ghost} onClick={onClose} disabled={busy}>
            {t('shell.cancel')}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={styles.danger}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? t('taskDetail.saving') : t(confirmKey)}
          </button>
        </div>
      </div>
    </div>
  );
}
