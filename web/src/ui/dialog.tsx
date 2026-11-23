import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  type FormEventHandler,
  type ReactNode,
  type RefObject,
} from 'react';
import { t } from '@/i18n';
import styles from './dialog.module.css';

/**
 * 模态基座：统一 Esc、焦点陷阱、焦点归还、busy 锁、aria 与点遮罩关闭。
 *
 * - 多层叠放时只有最上层响应 Esc / Tab（确认框盖在详情面板上，Esc 只关确认框）。
 * - 默认带居中对话框的外观；`bare` 只保留行为，外观完全由 `backdropClassName` / `className` 提供，
 *   供侧栏与已有定制样式的浮层渐进接入。
 */

export type DialogSize = 'sm' | 'md' | 'lg';

interface DialogProps {
  children: ReactNode;
  onClose: () => void;
  /** 处理中：Esc、点遮罩与头部关闭按钮都不可用。 */
  busy?: boolean;
  /** 无可见标题时用 aria-label 给出名称。 */
  label?: string;
  /** 标题元素 id；缺省时由 `DialogHeader` 自动关联。 */
  labelledBy?: string;
  /** 补充说明元素 id（aria-describedby）。 */
  describedBy?: string;
  /** 宽度档位：sm 480 / md 520 / lg 560 px。 */
  size?: DialogSize;
  /** 只要行为，不要内置外观。 */
  bare?: boolean;
  /** 面板元素：默认 section；需要原生表单提交时用 form。 */
  as?: 'section' | 'form';
  onSubmit?: FormEventHandler<HTMLElement>;
  backdropClassName?: string;
  className?: string;
  /** 打开时优先聚焦的元素；缺省聚焦面板本身（内部已有 autoFocus 时不抢焦点）。 */
  initialFocusRef?: RefObject<HTMLElement | null>;
}

interface DialogContextValue {
  titleId: string;
  onClose: () => void;
  busy: boolean;
}

const DialogContext = createContext<DialogContextValue | null>(null);

const FOCUSABLE = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/** 当前打开的模态，末尾为最上层。 */
const openDialogs: symbol[] = [];

function join(...names: (string | false | undefined)[]): string | undefined {
  const value = names.filter(Boolean).join(' ');
  return value === '' ? undefined : value;
}

export function Dialog({
  children,
  onClose,
  busy = false,
  label,
  labelledBy,
  describedBy,
  size = 'sm',
  bare = false,
  as: Panel = 'section',
  onSubmit,
  backdropClassName,
  className,
  initialFocusRef,
}: DialogProps) {
  const autoId = useId();
  const titleId = labelledBy ?? autoId;
  const panelRef = useRef<HTMLFormElement>(null);
  const pressedOnBackdrop = useRef(false);
  const latest = useRef({ onClose, busy, initialFocusRef });

  useEffect(() => {
    latest.current = { onClose, busy, initialFocusRef };
  });

  useEffect(() => {
    const token = Symbol('dialog');
    openDialogs.push(token);
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;

    const preferred = latest.current.initialFocusRef?.current;
    if (preferred) {
      preferred.focus();
    } else if (panel && !panel.contains(document.activeElement)) {
      panel.focus();
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (openDialogs[openDialogs.length - 1] !== token) return;

      if (event.key === 'Escape') {
        // 面板内部输入框等自己处理 Esc 时会先 stopPropagation，到不了这里；
        // 走到这里说明该由对话框处理，同时拦住 window 上残留的 Esc 监听。
        event.stopPropagation();
        if (!latest.current.busy) latest.current.onClose();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const active = document.activeElement;
      if (!panel.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const index = openDialogs.indexOf(token);
      if (index >= 0) openDialogs.splice(index, 1);
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  const sizeClass = size === 'md' ? styles.sizeMd : size === 'lg' ? styles.sizeLg : undefined;

  return (
    <DialogContext.Provider value={{ titleId, onClose, busy }}>
      <div
        className={join(!bare && styles.backdrop, backdropClassName)}
        role="presentation"
        onPointerDown={(event) => {
          pressedOnBackdrop.current = event.target === event.currentTarget;
        }}
        onClick={(event) => {
          const closable = pressedOnBackdrop.current && event.target === event.currentTarget;
          pressedOnBackdrop.current = false;
          if (closable && !busy) onClose();
        }}
      >
        <Panel
          ref={panelRef}
          onSubmit={onSubmit}
          className={join(styles.root, !bare && styles.panel, !bare && sizeClass, className)}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          aria-labelledby={label ? undefined : titleId}
          aria-describedby={describedBy}
          tabIndex={-1}
        >
          {children}
        </Panel>
      </div>
    </DialogContext.Provider>
  );
}

/** 标题 + 关闭按钮；标题 id 与对话框的 aria-labelledby 自动关联。 */
export function DialogHeader({ title }: { title: string }) {
  const context = useContext(DialogContext);
  if (!context) throw new Error('DialogHeader must be rendered inside Dialog');
  return (
    <header className={styles.head}>
      <h2 id={context.titleId} className={styles.title}>
        {title}
      </h2>
      <button
        type="button"
        className={styles.close}
        onClick={context.onClose}
        disabled={context.busy}
      >
        {t('shell.close')}
      </button>
    </header>
  );
}

/** 底部操作区；窄屏吸底。 */
export function DialogActions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}
