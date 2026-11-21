import { useCallback, useEffect, useRef, useState } from 'react';
import { t, type MessageKey } from '@/i18n';
import { MoreIcon } from '@/ui/icons';
import styles from './branch-actions.module.css';

interface BranchActionsProps {
  /** `null` 表示可新建子分支；非空时菜单项禁用并显示原因。 */
  createReason: MessageKey | null;
  readonly: boolean;
  onOpenCreate: () => void;
  onOpenRename: () => void;
  onOpenMove: () => void;
}

/**
 * 分支详情页头的「更多」菜单（M04 §4.1 / B01）。
 *
 * 不可用项保留并写明原因；收尾入口在只读分支上不出现。
 */
export function BranchActions({
  createReason,
  readonly,
  onOpenCreate,
  onOpenRename,
  onOpenMove,
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
          <button
            type="button"
            role="menuitem"
            className={styles.item}
            disabled={createReason !== null}
            onClick={() => run(onOpenCreate)}
          >
            <span>{t('branches.newChild')}</span>
            {createReason ? <span className={styles.reason}>{t(createReason)}</span> : null}
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.item}
            disabled={readonly}
            onClick={() => run(onOpenRename)}
          >
            <span>{t('branches.rename')}</span>
            {readonly ? (
              <span className={styles.reason}>{t('branches.reason.readonly')}</span>
            ) : null}
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.item}
            disabled={readonly}
            onClick={() => run(onOpenMove)}
          >
            <span>{t('branches.move')}</span>
            {readonly ? (
              <span className={styles.reason}>{t('branches.reason.readonly')}</span>
            ) : null}
          </button>
          {readonly ? null : (
            <button type="button" role="menuitem" className={styles.item} disabled>
              <span>{t('branches.finish')}</span>
              <span className={styles.reason}>{t('branches.reason.later')}</span>
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
