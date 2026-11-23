import { useId, useRef } from 'react';
import { t, type MessageKey } from '@/i18n';
import { Dialog } from '@/ui/dialog';
import styles from './confirm-dialog.module.css';

interface ConfirmDialogProps {
  titleKey: MessageKey;
  bodyKey: MessageKey;
  /** 需要拼接分支名等动态内容时替代 `bodyKey` 的整段文案。 */
  bodyText?: string;
  confirmKey: MessageKey;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** 一次确认的小弹层；取消待办等不可逆动作必须经过它。 */
export function ConfirmDialog({
  titleKey,
  bodyKey,
  bodyText,
  confirmKey,
  busy = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const titleId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog
      bare
      backdropClassName={styles.backdrop}
      className={styles.dialog}
      labelledBy={titleId}
      busy={busy}
      onClose={onClose}
      initialFocusRef={confirmRef}
    >
      <h2 className={styles.title} id={titleId}>
        {t(titleKey)}
      </h2>
      <p className={styles.body}>{bodyText ?? t(bodyKey)}</p>
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
    </Dialog>
  );
}
