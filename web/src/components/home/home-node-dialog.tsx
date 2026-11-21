import { useEffect, useRef } from 'react';
import { t } from '@/i18n';
import styles from './home-node-dialog.module.css';

interface HomeNodeDialogProps {
  onClose: () => void;
  onLocate: () => void;
}

/** 示例节点详情：焦点进入、`Esc` 关闭、关闭后回到触发控件。 */
export function HomeNodeDialog({ onClose, onLocate }: HomeNodeDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="home-node-title"
        aria-describedby="home-node-note"
        ref={dialogRef}
      >
        <span className={styles.tag}>{t('home.node.tag')}</span>
        <h2 className={styles.title} id="home-node-title">
          {t('home.node.title')}
        </h2>
        <dl className={styles.meta}>
          <div className={styles.metaRow}>
            <dt>{t('home.timeline.branchLabel')}</dt>
            <dd>{t('home.node.branch')}</dd>
          </div>
          <div className={styles.metaRow}>
            <dt>{t('home.node.timeLabel')}</dt>
            <dd>{t('home.node.time')}</dd>
          </div>
        </dl>
        <p className={styles.note} id="home-node-note">
          {t('home.node.note')}
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.locate} onClick={onLocate}>
            {t('home.node.locate')}
          </button>
          <button type="button" className={styles.close} onClick={onClose} ref={closeRef}>
            {t('home.node.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
