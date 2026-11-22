import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import { localDate } from '@/core/clock';
import { branchShadeForDepth, normalizeBranchColor } from '@/core/rules/branch-color';
import type { Branch, BranchStatus } from '@/data/types';
import { t, type MessageKey } from '@/i18n';
import {
  BranchIcon,
  BriefcaseIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  HeartIcon,
  HomeIcon,
  MergeIcon,
  MoreIcon,
  PinIcon,
  type IconSize,
} from '@/ui/icons';
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
  | 'pinned'
  | 'order-first'
  | 'order-last'
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
  pinned: 'branches.reason.pinned',
  'order-first': 'branches.reason.orderFirst',
  'order-last': 'branches.reason.orderLast',
  later: 'branches.reason.later',
};

const STATUS_KEYS: Record<BranchStatus, MessageKey> = {
  active: 'branches.status.active',
  merged: 'branches.status.merged',
  dropped: 'branches.status.dropped',
};

/** 画稿为珊瑚橙/晴蓝/蜂蜜金各配了一枚语义图标，其余色相沿用分支图标。 */
function FamilyGlyph({ color, size }: { color: string; size: IconSize }) {
  if (color === 'coral') return <BriefcaseIcon size={size} />;
  if (color === 'sky') return <HeartIcon size={size} />;
  if (color === 'honey') return <HomeIcon size={size} />;
  return <BranchIcon size={size} />;
}

interface BranchRowProps {
  branch: Branch;
  /** `family` 渲染一级分支的家庭卡头，`row` 为普通行。 */
  variant?: 'row' | 'family';
  /** 家庭卡头展示的直接子分支数。 */
  childCount?: number;
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
  pinned: boolean;
  pinReason: BranchBlockReason | null;
  moveUpReason: BranchBlockReason | null;
  moveDownReason: BranchBlockReason | null;
  onTogglePinned: (branch: Branch) => void;
  onMoveUp: (branch: Branch) => void;
  onMoveDown: (branch: Branch) => void;
  /** 桌面拖拽（V1-08 OP-03）；窄屏与根分支不参与。 */
  dragEnabled: boolean;
  dragging: boolean;
  dropPosition: 'before' | 'after' | null;
  canAcceptDrop: boolean;
  onDragStartBranch: (branch: Branch) => void;
  onDragOverBranch: (branch: Branch, position: 'before' | 'after') => void;
  onDropOnBranch: (branch: Branch) => void;
  onDragEndBranch: () => void;
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
  variant = 'row',
  childCount = 0,
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
  pinned,
  pinReason,
  moveUpReason,
  moveDownReason,
  onTogglePinned,
  onMoveUp,
  onMoveDown,
  dragEnabled,
  dragging,
  dropPosition,
  canAcceptDrop,
  onDragStartBranch,
  onDragOverBranch,
  onDropOnBranch,
  onDragEndBranch,
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
        key: 'pin',
        labelKey: pinned ? 'branches.unpin' : 'branches.pin',
        reason: pinReason,
        run: () => onTogglePinned(branch),
      },
      {
        key: 'move-up',
        labelKey: 'branches.moveUp',
        reason: moveUpReason,
        run: () => onMoveUp(branch),
      },
      {
        key: 'move-down',
        labelKey: 'branches.moveDown',
        reason: moveDownReason,
        run: () => onMoveDown(branch),
      },
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
  const toneStyle = {
    '--row-tone': dotColor === 'neutral' ? 'var(--neutral)' : `var(--${dotColor}-${dotShade})`,
  } as CSSProperties;
  const progressPct =
    branch.taskTotal > 0 ? Math.round((branch.taskDone / branch.taskTotal) * 100) : 0;
  const draggable = dragEnabled && branch.depth > 0 && !pinned;
  const isFamily = variant === 'family';
  const dateAt =
    branch.status === 'merged'
      ? branch.finishedAt
      : branch.status === 'dropped'
        ? branch.droppedAt
        : branch.ownLastCommitAt;
  const dateLabelKey: MessageKey =
    branch.status === 'merged'
      ? 'branches.date.mergedAt'
      : branch.status === 'dropped'
        ? 'branches.date.droppedAt'
        : 'branches.date.lastCommit';
  const dateText =
    dateAt === null ? t('branches.date.none') : localDate(dateAt).slice(5).replace('-', '.');

  const expandLabel = t(expanded ? 'branches.collapse' : 'branches.expand');
  const chevron = expanded ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />;
  const marker = (
    <span className={styles.dot} data-color={dotColor} data-shade={dotShade} aria-hidden="true" />
  );
  const disclosure = hasChildren ? (
    <button
      type="button"
      className={styles.disclosure}
      aria-expanded={expanded}
      aria-label={expandLabel}
      data-collapsed={!expanded}
      onClick={() => onToggle(branch.id, !expanded)}
    >
      {marker}
      <span className={styles.disclosureChevron} aria-hidden="true">
        {chevron}
      </span>
    </button>
  ) : (
    marker
  );

  const menuAnchor = (
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
        <MoreIcon size={17} />
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
  );

  const metaDate = (
    <span className={styles.metaDate}>
      <span className={styles.dateLabel}>{t(dateLabelKey)}</span>
      <time className={styles.dateValue}>{dateText}</time>
    </span>
  );

  const progress = (
    <span className={styles.progress} aria-label={t('branches.progressLabel')}>
      <span className={styles.progressTrack} aria-hidden="true">
        <span className={styles.progressFill} style={{ width: `${progressPct}%` }} />
      </span>
      <span className={styles.progressValue}>
        {branch.taskDone}/{branch.taskTotal}
      </span>
    </span>
  );

  const statusChip = (
    <span className={styles.status} data-status={branch.status}>
      {branch.status === 'merged' ? (
        <MergeIcon size={13} />
      ) : (
        <i className={styles.statusDot} aria-hidden="true" />
      )}
      {t(STATUS_KEYS[branch.status])}
    </span>
  );

  const pinMark = pinned ? (
    <span
      className={styles.pin}
      role="img"
      aria-label={t('branches.pinned')}
      title={t('branches.pinned')}
    >
      <PinIcon size={14} />
    </span>
  ) : null;

  const dragProps = {
    'data-status': branch.status,
    'data-dragging': dragging || undefined,
    'data-drop': dropPosition ?? undefined,
    draggable,
    onDragStart: (event: DragEvent<HTMLElement>) => {
      if (!draggable) return;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', branch.id);
      onDragStartBranch(branch);
    },
    onDragOver: (event: DragEvent<HTMLElement>) => {
      if (!draggable || !canAcceptDrop) {
        if (dragging) event.dataTransfer.dropEffect = 'none';
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      const rect = event.currentTarget.getBoundingClientRect();
      const position = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
      onDragOverBranch(branch, position);
    },
    onDrop: (event: DragEvent<HTMLElement>) => {
      if (!draggable || !canAcceptDrop) return;
      event.preventDefault();
      onDropOnBranch(branch);
    },
    onDragEnd: () => onDragEndBranch(),
  };

  if (isFamily) {
    return (
      <li className={styles.familyNode} data-color={dotColor} data-shade={dotShade}>
        <section className={styles.family}>
          <header className={styles.familyHead} style={toneStyle} {...dragProps}>
            <div className={styles.familyTitle}>
              {hasChildren ? (
                <button
                  type="button"
                  className={styles.familyIcon}
                  aria-expanded={expanded}
                  aria-label={expandLabel}
                  data-collapsed={!expanded}
                  onClick={() => onToggle(branch.id, !expanded)}
                >
                  <FamilyGlyph color={dotColor} size={18} />
                  <span className={styles.familyChevron} aria-hidden="true">
                    {chevron}
                  </span>
                </button>
              ) : (
                <span className={styles.familyIcon} aria-hidden="true">
                  <FamilyGlyph color={dotColor} size={18} />
                </span>
              )}
              <span className={styles.familyText}>
                <Link
                  ref={linkRef}
                  className={styles.familyName}
                  to={`/branches/${branch.id}`}
                  title={branch.title}
                >
                  {branch.title}
                </Link>
                <span className={styles.caption}>
                  {childCount} {t('branches.directChildrenSuffix')}
                </span>
              </span>
            </div>
            <div className={styles.familyMeta}>
              {pinMark}
              {metaDate}
              {statusChip}
              {menuAnchor}
            </div>
          </header>
          {children}
        </section>
      </li>
    );
  }

  return (
    <li className={styles.node}>
      <div
        className={styles.row}
        style={toneStyle}
        data-selected={focusId === branch.id ? true : undefined}
        {...dragProps}
      >
        <span className={styles.nameCell}>
          {pinMark}
          {disclosure}
          <Link
            ref={linkRef}
            className={styles.name}
            to={`/branches/${branch.id}`}
            title={branch.title}
          >
            {branch.title}
          </Link>
        </span>
        <span className={styles.meta}>
          {progress}
          {metaDate}
          {statusChip}
        </span>
        {menuAnchor}
      </div>
      {children}
    </li>
  );
}
