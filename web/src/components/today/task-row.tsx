import { useCallback, useEffect, useRef, useState } from 'react';
import type { Branch, Task } from '@/data/types';
import { t, type MessageKey } from '@/i18n';
import { MoreIcon } from '@/ui/icons';
import { BranchTag } from './branch-tag';
import styles from './task-row.module.css';

interface TaskRowProps {
  task: Task;
  branch: Branch | undefined;
  branchTrail: string;
  todayDate: string;
  /** 只读原因；非空时隐藏勾选与菜单，名称仍可打开详情。 */
  readonlyReason: MessageKey | null;
  busy: boolean;
  /** 完成失败后就地提示，勾选仍可重试。 */
  error: boolean;
  /** P01 行显示分支路径；P03 分支内待办不重复显示所属分支。 */
  showBranch?: boolean;
  /** 全部待办不提供组内移动，隐藏上移 / 下移菜单项。 */
  showReorder?: boolean;
  checkRef?: (node: HTMLButtonElement | null) => void;
  onComplete: (task: Task) => void;
  onOpen: (task: Task) => void;
  onPlan: (task: Task) => void;
  onUnplan: (task: Task) => void;
  onCancel: (task: Task) => void;
  /** 键盘 / 窄屏菜单里的组内移动（V1-08 C-05）。 */
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: (task: Task) => void;
  onMoveDown?: (task: Task) => void;
  /** 桌面拖拽（V1-08 OP-01）；只读行与窄屏不提供。 */
  dragEnabled?: boolean;
  dragging?: boolean;
  dropPosition?: 'before' | 'after' | null;
  onDragStartTask?: (task: Task) => void;
  onDragOverTask?: (task: Task, position: 'before' | 'after') => void;
  onDropOnTask?: (task: Task) => void;
  onDragEndTask?: () => void;
}

function dueLabel(task: Task, todayDate: string): string {
  if (!task.dueDate) return t('today.task.noDue');
  if (task.dueDate === todayDate) return t('today.task.todayLabel');
  const [, month, day] = task.dueDate.split('-').map(Number);
  return `${month}${t('milestone.date.monthSuffix')} ${day}${t('milestone.date.daySuffix')}${t('today.task.dueSuffix')}`;
}

/**
 * 一条待办（P01 / P03 / 全部待办共用）。
 *
 * 三个独立入口：勾选完成、点名称打开详情、行尾「更多」。
 * 窄屏不依赖悬停；只读分支不提供完成与编辑，只写明原因。
 */
export function TaskRow({
  task,
  branch,
  branchTrail,
  todayDate,
  readonlyReason,
  busy,
  error,
  showBranch = true,
  showReorder = true,
  checkRef,
  onComplete,
  onOpen,
  onPlan,
  onUnplan,
  onCancel,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
  dragEnabled = true,
  dragging = false,
  dropPosition = null,
  onDragStartTask,
  onDragOverTask,
  onDropOnTask,
  onDragEndTask,
}: TaskRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!anchorRef.current?.contains(event.target as Node)) closeMenu();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
        moreRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [closeMenu, menuOpen]);

  const draggable = dragEnabled && readonlyReason === null && onDragStartTask !== undefined;

  return (
    <li
      className={styles.row}
      data-overdue={task.dueDate && task.dueDate < todayDate ? 'true' : undefined}
      data-dragging={dragging || undefined}
      data-drop={dropPosition ?? undefined}
      draggable={draggable}
      onDragStart={(event) => {
        if (!draggable) return;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', task.id);
        onDragStartTask?.(task);
      }}
      onDragOver={(event) => {
        if (!draggable) return;
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        const position = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
        onDragOverTask?.(task, position);
      }}
      onDrop={(event) => {
        if (!draggable) return;
        event.preventDefault();
        onDropOnTask?.(task);
      }}
      onDragEnd={() => onDragEndTask?.()}
    >
      <button
        ref={checkRef}
        type="button"
        className={styles.check}
        data-task-check="true"
        aria-label={`${t('today.task.completeNamed')}${task.title}`}
        disabled={busy || readonlyReason !== null}
        onClick={() => onComplete(task)}
      >
        <span className={styles.checkBox} aria-hidden="true" />
      </button>

      <div className={styles.label}>
        <button type="button" className={styles.title} onClick={() => onOpen(task)}>
          {task.title}
        </button>
        {showBranch ? <BranchTag branch={branch} trail={branchTrail} /> : null}
        {readonlyReason ? <span className={styles.reason}>{t(readonlyReason)}</span> : null}
      </div>

      <span className={styles.date}>
        {dueLabel(task, todayDate)}
        {task.plannedDate === todayDate ? <small>{t('today.task.planned')}</small> : null}
      </span>

      {readonlyReason === null ? (
        <div className={styles.menuAnchor} ref={anchorRef}>
          <button
            ref={moreRef}
            type="button"
            className={styles.more}
            aria-label={t('today.task.more')}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MoreIcon size={18} />
          </button>
          {menuOpen ? (
            <div className={styles.menu} role="menu">
              <button
                type="button"
                className={styles.menuItem}
                role="menuitem"
                onClick={() => {
                  closeMenu();
                  if (task.plannedDate === todayDate) onUnplan(task);
                  else onPlan(task);
                }}
              >
                {task.plannedDate === todayDate
                  ? t('today.task.unplan')
                  : t('today.task.planToday')}
              </button>
              {showReorder ? (
                <>
                  <button
                    type="button"
                    className={styles.menuItem}
                    role="menuitem"
                    disabled={!canMoveUp}
                    onClick={() => {
                      closeMenu();
                      onMoveUp?.(task);
                    }}
                  >
                    {t('today.task.moveUp')}
                  </button>
                  <button
                    type="button"
                    className={styles.menuItem}
                    role="menuitem"
                    disabled={!canMoveDown}
                    onClick={() => {
                      closeMenu();
                      onMoveDown?.(task);
                    }}
                  >
                    {t('today.task.moveDown')}
                  </button>
                </>
              ) : null}
              <button
                type="button"
                className={`${styles.menuItem} ${styles.danger}`}
                role="menuitem"
                onClick={() => {
                  closeMenu();
                  onCancel(task);
                }}
              >
                {t('today.task.cancel')}
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <span />
      )}

      {error ? (
        <p className={styles.fail} role="alert">
          {t('today.complete.failed')}
          <button type="button" onClick={() => onComplete(task)}>
            {t('today.task.retry')}
          </button>
        </p>
      ) : null}
    </li>
  );
}
