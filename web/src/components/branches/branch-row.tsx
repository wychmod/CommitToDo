import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { branchShadeForDepth, normalizeBranchColor } from '@/core/rules/branch-color';
import type { Branch, BranchStatus } from '@/data/types';
import { t, type MessageKey } from '@/i18n';
import { ChevronDownIcon, ChevronRightIcon, MoreIcon } from '@/ui/icons';
import styles from './branch-row.module.css';

/** 菜单项不可用的原因；`later` 表示功能在后续版本提供。 */
export type BranchBlockReason =
  | 'readonly'
  | 'depth'
  | 'parent-full'
  | 'tree-full'
  | 'finish-parent'
  | 'finish-children'
  | 'active-children'
  | 'ancestor-readonly'
  | 'restore-full'
  | 'later';

const REASON_KEYS: Record<BranchBlockReason, MessageKey> = {
  readonly: 'branches.reason.readonly',
  depth: 'branches.reason.depth',
  'parent-full': 'branches.reason.parentFull',
  'tree-full': 'branches.reason.treeFull',
  'finish-parent': 'branches.reason.finishParent',
  'finish-children': 'branches.reason.finishChildren',
  'active-children': 'branches.reason.activeChildren',
  'ancestor-readonly': 'branches.reason.ancestorReadonly',
  'restore-full': 'branches.reason.restoreFull',
  later: 'branches.reason.later',
};

const STATUS_KEYS: Record<BranchStatus, MessageKey> = {
  active: 'branches.status.active',
  merged: 'branches.status.merged',
  dropped: 'branches.status.dropped',
};

interface BranchRowProps {
  branch: Branch;
  hasChildren: boolean;
  expanded: boolean;
  focusId: string | null;
  createReason: BranchBlockReason | null;
  renameReason: BranchBlockReason | null;
  moveReason: BranchBlockReason | null;
  finishReason: BranchBlockReason | null;
  deleteReason: BranchBlockReason | null;
  pauseReason: BranchBlockReason | null;
  resumeReason: BranchBlockReason | null;
  archiveReason: BranchBlockReason | null;
  onToggle: (branchId: string, expanded: boolean) => void;
  onFocusHandled: () => void;
  onCreateChild: (branch: Branch) => void;
  onRename: (branch: Branch) => void;
  onMove: (branch: Branch) => void;
  onFinish: (branch: Branch) => void;
  onDelete: (branch: Branch) => void;
  onPause: (branch: Branch) => void;
  onResume: (branch: Branch) => void;
  onArchive: (branch: Branch) => void;
  children?: ReactNode;
}

interface MenuItem {
  key: string;
  labelKey: MessageKey;
  reason: BranchBlockReason | null;
  run?: () => void;
}

/**
 * 分支行（B01）。
 *
 * 菜单贴着当前行打开，不居中悬浮；不可用项保留并写明原因。
 * Esc 关闭后焦点回到「更多」，点击外部关闭。
 */
export function BranchRow({
  branch,
  hasChildren,
  expanded,
  focusId,
  createReason,
  renameReason,
  moveReason,
  finishReason,
  deleteReason,
  pauseReason,
  resumeReason,
  archiveReason,
  onToggle,
  onFocusHandled,
  onCreateChild,
  onRename,
  onMove,
  onFinish,
  onDelete,
  onPause,
  onResume,
  onArchive,
  children,
}: BranchRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (focusId !== branch.id || !linkRef.current) return;
    linkRef.current.focus();
    linkRef.current.scrollIntoView({ block: 'nearest' });
    onFocusHandled();
  }, [focusId, branch.id, onFocusHandled]);

  const closeMenu = useCallback((returnFocus: boolean) => {
    setMenuOpen(false);
    if (returnFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu(true);
      }
    };
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      closeMenu(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [menuOpen, closeMenu]);

  useEffect(() => {
    if (!menuOpen) return;
    const first = menuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)');
    first?.focus();
  }, [menuOpen]);

  const items: MenuItem[] = [
    {
      key: 'create',
      labelKey: 'branches.newChild',
      reason: createReason,
      run: () => onCreateChild(branch),
    },
    {
      key: 'rename',
      labelKey: 'branches.rename',
      reason: renameReason,
      run: () => onRename(branch),
    },
  ];
  if (branch.depth > 0) {
    items.push(
      {
        key: 'move',
        labelKey: 'branches.move',
        reason: moveReason,
        run: () => onMove(branch),
      },
      {
        key: 'finish',
        labelKey: 'branches.finish',
        reason: finishReason,
        run: () => onFinish(branch),
      },
      {
        key: 'delete',
        labelKey: 'branches.delete',
        reason: deleteReason,
        run: () => onDelete(branch),
      },
    );
    // V1-01：生命周期动作追加在收尾、删除之后。
    if (branch.archivedAt === null) {
      if (branch.status === 'active') {
        items.push({
          key: 'pause',
          labelKey: 'branches.pause',
          reason: pauseReason,
          run: () => onPause(branch),
        });
      }
      if (branch.status === 'dropped') {
        items.push({
          key: 'resume',
          labelKey: 'branches.resume',
          reason: resumeReason,
          run: () => onResume(branch),
        });
      }
      if (branch.status !== 'active') {
        items.push({
          key: 'archive',
          labelKey: 'branches.archive',
          reason: archiveReason,
          run: () => onArchive(branch),
        });
      }
    }
  }

  const choose = (item: MenuItem) => {
    if (item.reason || !item.run) return;
    setMenuOpen(false);
    item.run();
  };

  const dotColor = branch.depth === 0 ? 'neutral' : normalizeBranchColor(branch.color);
  const dotShade = branchShadeForDepth(branch.depth);

  return (
    <li className={styles.node}>
      <div className={styles.row} data-status={branch.status}>
        {hasChildren ? (
          <button
            type="button"
            className={styles.toggle}
            aria-expanded={expanded}
            aria-label={t(expanded ? 'branches.collapse' : 'branches.expand')}
            onClick={() => onToggle(branch.id, !expanded)}
          >
            {expanded ? <ChevronDownIcon size={16} /> : <ChevronRightIcon size={16} />}
          </button>
        ) : (
          <span className={styles.togglePlaceholder} aria-hidden="true" />
        )}
        <span
          className={styles.dot}
          data-color={dotColor}
          data-shade={dotShade}
          aria-hidden="true"
        />
        <Link
          ref={linkRef}
          className={styles.name}
          to={`/branches/${branch.id}`}
          title={branch.title}
        >
          {branch.title}
        </Link>
        <span className={styles.status}>{t(STATUS_KEYS[branch.status])}</span>
        <span className={styles.progress} aria-label={t('branches.progressLabel')}>
          {branch.taskDone}/{branch.taskTotal}
        </span>
        <div className={styles.menuAnchor}>
          <button
            ref={triggerRef}
            type="button"
            className={styles.more}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={t('branches.more')}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MoreIcon size={18} />
          </button>
          {menuOpen ? (
            <div ref={menuRef} className={styles.menu} role="menu" aria-label={t('branches.more')}>
              {items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="menuitem"
                  className={styles.menuItem}
                  disabled={Boolean(item.reason)}
                  onClick={() => choose(item)}
                >
                  <span className={styles.menuLabel}>{t(item.labelKey)}</span>
                  {item.reason ? (
                    <span className={styles.menuReason}>{t(REASON_KEYS[item.reason])}</span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {children}
    </li>
  );
}
