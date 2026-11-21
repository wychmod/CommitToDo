import { useCallback, useEffect, useRef, useState } from 'react';
import { t, type MessageKey } from '@/i18n';
import { MoreIcon } from '@/ui/icons';
import styles from './branch-actions.module.css';

interface BranchActionsProps {
  /** `null` 表示可新建子分支；非空时菜单项禁用并显示原因。 */
  createReason: MessageKey | null;
  readonly: boolean;
  /** `null` 表示可收尾；根分支不展示收尾项。 */
  showFinish: boolean;
  finishReason: MessageKey | null;
  /** `null` 表示可打开删除确认；根分支不展示删除项。 */
  showDelete: boolean;
  deleteReason: MessageKey | null;
  showPause: boolean;
  pauseReason: MessageKey | null;
  showResume: boolean;
  resumeReason: MessageKey | null;
  showArchive: boolean;
  archiveReason: MessageKey | null;
  /** 已归档分支只保留取消归档，不展示结构动作。 */
  showUnarchive: boolean;
  unarchiveReason: MessageKey | null;
  onOpenCreate: () => void;
  onOpenRename: () => void;
  onOpenMove: () => void;
  onOpenFinish: () => void;
  onOpenDelete: () => void;
  onOpenPause: () => void;
  onOpenResume: () => void;
  onOpenArchive: () => void;
  onOpenUnarchive: () => void;
}

interface MenuItem {
  key: string;
  labelKey: MessageKey;
  reason: MessageKey | null;
  run: () => void;
}

/**
 * 分支详情页头的「更多」菜单（M04 §4.1 / M08 / V1-01）。
 *
 * 收尾在最前，删除空分支随后，放下 / 重新开始 / 归档追加在它们之后。
 * 已归档分支只保留取消归档；不可用项保留并写明原因。
 */
export function BranchActions({
  createReason,
  readonly,
  showFinish,
  finishReason,
  showDelete,
  deleteReason,
  showPause,
  pauseReason,
  showResume,
  resumeReason,
  showArchive,
  archiveReason,
  showUnarchive,
  unarchiveReason,
  onOpenCreate,
  onOpenRename,
  onOpenMove,
  onOpenFinish,
  onOpenDelete,
  onOpenPause,
  onOpenResume,
  onOpenArchive,
  onOpenUnarchive,
}: BranchActionsProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!anchorRef.current?.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [close, open]);

  const run = (action: () => void) => {
    close();
    action();
  };

  const items: MenuItem[] = [];
  if (showUnarchive) {
    items.push({
      key: 'unarchive',
      labelKey: 'branches.unarchive',
      reason: unarchiveReason,
      run: onOpenUnarchive,
    });
  } else {
    if (showFinish) {
      items.push({
        key: 'finish',
        labelKey: 'branches.finish',
        reason: finishReason,
        run: onOpenFinish,
      });
    }
    items.push(
      {
        key: 'create',
        labelKey: 'branches.newChild',
        reason: createReason,
        run: onOpenCreate,
      },
      {
        key: 'rename',
        labelKey: 'branches.rename',
        reason: readonly ? 'branches.reason.readonly' : null,
        run: onOpenRename,
      },
      {
        key: 'move',
        labelKey: 'branches.move',
        reason: readonly ? 'branches.reason.readonly' : null,
        run: onOpenMove,
      },
    );
    if (showDelete) {
      items.push({
        key: 'delete',
        labelKey: 'branches.delete',
        reason: deleteReason,
        run: onOpenDelete,
      });
    }
    if (showPause) {
      items.push({
        key: 'pause',
        labelKey: 'branches.pause',
        reason: pauseReason,
        run: onOpenPause,
      });
    }
    if (showResume) {
      items.push({
        key: 'resume',
        labelKey: 'branches.resume',
        reason: resumeReason,
        run: onOpenResume,
      });
    }
    if (showArchive) {
      items.push({
        key: 'archive',
        labelKey: 'branches.archive',
        reason: archiveReason,
        run: onOpenArchive,
      });
    }
  }

  return (
    <div className={styles.anchor} ref={anchorRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('branchDetail.actions.more')}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreIcon size={18} />
      </button>
      {open ? (
        <div className={styles.menu} role="menu" aria-label={t('branchDetail.actions.more')}>
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              className={styles.item}
              disabled={item.reason !== null}
              onClick={() => run(item.run)}
            >
              <span>{t(item.labelKey)}</span>
              {item.reason ? <span className={styles.reason}>{t(item.reason)}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
