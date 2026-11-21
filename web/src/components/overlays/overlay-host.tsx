import { t, type MessageKey } from '@/i18n';
import { useShellStore, type ShellOverlay } from '@/stores/shell.store';
import { CommitDetailPanel } from '@/components/commit-detail/commit-detail-panel';
import { QuickAddPanel } from '@/components/today/quick-add-panel';
import { TaskDetailPanel } from '@/components/today/task-detail-panel';
import styles from './overlay-host.module.css';

type PlaceholderOverlay = Exclude<ShellOverlay, 'quick-add' | 'task-detail' | 'commit-detail'>;

const COPY: Record<PlaceholderOverlay, { title: MessageKey; body: MessageKey }> = {
  search: { title: 'overlay.search.title', body: 'overlay.search.body' },
  confirm: { title: 'overlay.confirm.title', body: 'overlay.confirm.body' },
  onboarding: { title: 'overlay.onboarding.title', body: 'overlay.onboarding.body' },
  'undo-receipt': { title: 'overlay.undo-receipt.title', body: 'overlay.undo-receipt.body' },
  'milestone-detail': {
    title: 'overlay.milestone-detail.title',
    body: 'overlay.milestone-detail.body',
  },
  'milestone-new': { title: 'overlay.milestone-new.title', body: 'overlay.milestone-new.body' },
};

/**
 * 全局层外壳：快速添加、待办详情与提交详情已接入真实面板；
 * 搜索、确认框、首次引导与撤销回执仍为后续 PRD 的占位。
 */
export function OverlayHost() {
  const overlay = useShellStore((state) => state.overlay);
  const closeOverlay = useShellStore((state) => state.closeOverlay);

  if (!overlay) return null;
  if (overlay === 'quick-add') return <QuickAddPanel />;
  if (overlay === 'task-detail') return <TaskDetailPanel />;
  if (overlay === 'commit-detail') return <CommitDetailPanel />;

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
