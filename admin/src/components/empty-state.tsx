import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="admin-empty">
      {icon ? <div className="admin-empty__icon">{icon}</div> : null}
      <h3 className="admin-empty__title">{title}</h3>
      {description ? <p className="admin-empty__body">{description}</p> : null}
      {action ? <div className="admin-empty__action">{action}</div> : null}
    </div>
  );
}
