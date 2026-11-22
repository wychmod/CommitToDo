import type { ReactNode } from 'react';

export function StatePanel({
  tone = 'info',
  title,
  description,
  actionLabel,
  onAction,
  children,
}: {
  tone?: 'info' | 'warning' | 'error';
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
}) {
  return (
    <section className={`admin-state admin-state--${tone}`} role="status">
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {children}
      {actionLabel && onAction ? (
        <button type="button" className="admin-button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}
