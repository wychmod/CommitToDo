import { useRef } from 'react';
import { t } from '@/i18n';
import { Dialog } from '@/ui/dialog';
import styles from './home-node-dialog.module.css';

interface HomeNodeDialogProps {
  onClose: () => void;
  onLocate: () => void;
}

/** 示例节点详情：焦点进入、`Esc` 关闭、关闭后回到触发控件。 */
export function HomeNodeDialog({ onClose, onLocate }: HomeNodeDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog
      bare
      onClose={onClose}
      labelledBy="home-node-title"
      describedBy="home-node-note"
      initialFocusRef={closeRef}
      backdropClassName={styles.overlay}
      className={styles.dialog}
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
    </Dialog>
  );
}
