import { t, type MessageKey } from '@/i18n';
import { useShellStore, type ShellOverlay } from '@/stores/shell.store';
import styles from './overlay-host.module.css';

const COPY: Record<ShellOverlay, { title: MessageKey; body: MessageKey }> = {
  'quick-add': { title: 'overlay.quick-add.title', body: 'overlay.quick-add.body' },
  'task-detail': { title: 'overlay.task-detail.title', body: 'overlay.task-detail.body' },
  'commit-detail': { title: 'overlay.commit-detail.title', body: 'overlay.commit-detail.body' },
  search: { title: 'overlay.search.title', body: 'overlay.search.body' },
  confirm: { title: 'overlay.confirm.title', body: 'overlay.confirm.body' },
  onboarding: { title: 'overlay.onboarding.title', body: 'overlay.onboarding.body' },
  'undo-receipt': { title: 'overlay.undo-receipt.title', body: 'overlay.undo-receipt.body' },
};

/**
 * 全局层外壳：快速添加、待办详情、提交详情、搜索、确认框、首次引导、撤销回执。
 * 现在只渲染占位对话框，具体内容等页面实现时替换。
 */
export function OverlayHost() {
  const overlay = useShellStore((state) => state.overlay);
  const closeOverlay = useShellStore((state) => state.closeOverlay);

  if (!overlay) return null;
  const copy = COPY[overlay];

  return (
    <div className={styles.backdrop} role="presentation" onClick={closeOverlay}>
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={t(copy.title)}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.head}>
          <h2>{t(copy.title)}</h2>
          <button type="button" className={styles.close} onClick={closeOverlay}>
            {t('shell.close')}
          </button>
        </header>
        <p className={styles.body}>{t(copy.body)}</p>
      </section>
    </div>
  );
}
