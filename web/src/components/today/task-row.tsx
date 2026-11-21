import { useCallback, useEffect, useRef, useState } from 'react';
import { branchShadeForDepth, normalizeBranchColor } from '@/core/rules/branch-color';
import type { Branch, Task } from '@/data/types';
import { t, type MessageKey } from '@/i18n';
import { MoreIcon } from '@/ui/icons';
import styles from './task-row.module.css';

interface TaskRowProps {
  task: Task;
  branch: Branch | undefined;
  branchTrail: string;
  todayDate: string;
  /** 只读原因；非空时隐藏勾选、名称按钮与菜单。 */
  readonlyReason: MessageKey | null;
  busy: boolean;
  /** 完成失败后就地提示，勾选仍可重试。 */
  error: boolean;
  checkRef?: (node: HTMLButtonElement | null) => void;
  onComplete: (task: Task) => void;
  onOpen: (task: Task) => void;
  onPlan: (task: Task) => void;
  onUnplan: (task: Task) => void;
  onCancel: (task: Task) => void;
}

function dueLabel(task: Task, todayDate: string): string {
  if (!task.dueDate) return t('today.task.noDue');
  if (task.dueDate === todayDate) return t('today.task.todayLabel');
  return task.dueDate.slice(5);
}

/**
 * 一条待办（P01 / S01 共用）。
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
  checkRef,
  onComplete,
  onOpen,
  onPlan,
  onUnplan,
  onCancel,
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

  const color = branch ? normalizeBranchColor(branch.color) : 'sky';
  const shade = branch ? branchShadeForDepth(branch.depth) : 1;
  const action = () => {
    closeMenu();
  };

  return (
    <li
      className={styles.row}
      data-overdue={task.dueDate && task.dueDate < todayDate ? 'true' : undefined}
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

      <div className={styles.main}>
        <button type="button" className={styles.title} onClick={() => onOpen(task)}>
          {task.title}
        </button>
        <div className={styles.meta}>
          {branch ? (
            <span className={styles.branch}>
              <span
                className={styles.dot}
                style={{ backgroundColor: `var(--${color}-${shade})` }}
                aria-hidden="true"
              />
              <span className={styles.branchName} title={branchTrail}>
                {branchTrail}
              </span>
            </span>
          ) : null}
          <span className={styles.due}>{dueLabel(task, todayDate)}</span>
          {task.plannedDate === todayDate ? (
            <span className={styles.planned}>{t('today.task.planned')}</span>
          ) : null}
        </div>
        {readonlyReason ? <p className={styles.reason}>{t(readonlyReason)}</p> : null}
        {error ? (
          <p className={styles.error} role="alert">
            {t('today.complete.failed')}
          </p>
        ) : null}
      </div>

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
            <MoreIcon />
          </button>
          {menuOpen ? (
            <div className={styles.menu} role="menu">
              <button
                type="button"
                className={styles.menuItem}
                role="menuitem"
                onClick={() => {
                  action();
                  if (task.plannedDate === todayDate) onUnplan(task);
                  else onPlan(task);
                }}
              >
                {task.plannedDate === todayDate
                  ? t('today.task.unplan')
                  : t('today.task.planToday')}
              </button>
              <button
                type="button"
                className={styles.menuItem}
                role="menuitem"
                onClick={() => {
                  action();
                  onCancel(task);
                }}
              >
                {t('today.task.cancel')}
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <span className={styles.menuPlaceholder} aria-hidden="true" />
      )}
    </li>
  );
}
