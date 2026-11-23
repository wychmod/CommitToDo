import { t, type MessageKey } from '@/i18n';
import { useShellStore, type ShellOverlay } from '@/stores/shell.store';
import { CommitDetailPanel } from '@/components/commit-detail/commit-detail-panel';
import { MilestoneDetailPanel } from '@/components/milestone/milestone-detail-panel';
import { MilestoneNewPanel } from '@/components/milestone/milestone-new-panel';
import { BackfillPanel } from '@/components/milestone/backfill-panel';
import { QuickAddPanel } from '@/components/today/quick-add-panel';
import { SearchPanel } from '@/components/search/search-panel';
import { TaskDetailPanel } from '@/components/today/task-detail-panel';
import { Dialog } from '@/ui/dialog';
import styles from './overlay-host.module.css';

type PlaceholderOverlay = Exclude<
  ShellOverlay,
  | 'quick-add'
  | 'task-detail'
  | 'commit-detail'
  | 'milestone-detail'
  | 'milestone-new'
  | 'backfill'
  | 'search'
>;

const COPY: Record<PlaceholderOverlay, { title: MessageKey; body: MessageKey }> = {
  confirm: { title: 'overlay.confirm.title', body: 'overlay.confirm.body' },
  onboarding: { title: 'overlay.onboarding.title', body: 'overlay.onboarding.body' },
  'undo-receipt': { title: 'overlay.undo-receipt.title', body: 'overlay.undo-receipt.body' },
};

/**
 * 全局层外壳：快速添加、搜索、待办/提交/里程碑详情已接入真实面板；
 * 确认框、首次引导与撤销回执仍为后续 PRD 的占位。
 */
export function OverlayHost() {
  const overlay = useShellStore((state) => state.overlay);
  const closeOverlay = useShellStore((state) => state.closeOverlay);

  if (!overlay) return null;
  if (overlay === 'quick-add') return <QuickAddPanel />;
  if (overlay === 'search') return <SearchPanel />;
  if (overlay === 'task-detail') return <TaskDetailPanel />;
  if (overlay === 'commit-detail') return <CommitDetailPanel />;
  if (overlay === 'milestone-detail') return <MilestoneDetailPanel />;
  if (overlay === 'milestone-new') return <MilestoneNewPanel />;
  if (overlay === 'backfill') return <BackfillPanel />;

  const copy = COPY[overlay];

  return (
    <Dialog
      bare
      onClose={closeOverlay}
      label={t(copy.title)}
      backdropClassName={styles.backdrop}
      className={styles.dialog}
    >
      <header className={styles.head}>
        <h2>{t(copy.title)}</h2>
        <button type="button" className={styles.close} onClick={closeOverlay}>
          {t('shell.close')}
        </button>
      </header>
      <p className={styles.body}>{t(copy.body)}</p>
    </Dialog>
  );
}
