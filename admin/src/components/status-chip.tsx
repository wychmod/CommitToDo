import type { ReactNode } from 'react';

export type ChipTone = 'neutral' | 'accent';
export type StatusTone = 'ready' | 'notready' | 'unknown';

export function Chip({
  tone = 'neutral',
  children,
}: {
  tone?: ChipTone;
  children: ReactNode;
}) {
  return <span className={`admin-chip admin-chip--${tone}`}>{children}</span>;
}

export function StatusLabel({
  tone,
  children,
}: {
  tone: StatusTone;
  children: ReactNode;
}) {
  return (
    <span className={`admin-status admin-status--${tone}`}>
      <span className="admin-status__dot" aria-hidden="true" />
      {children}
    </span>
  );
}
