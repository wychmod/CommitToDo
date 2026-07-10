import * as React from 'react';

import { cn } from '@/core/utils/formatters';

export interface WorkspaceProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
  progressColor?: string;
  className?: string;
  children?: React.ReactNode;
  'aria-label'?: string;
}

/**
 * SVG ring progress indicator used by the Today Rhythm card.
 *
 * The ring is rendered with CSS variables so it automatically follows the v3
 * palette, while keeping the geometry fully configurable for tests.
 */
export function WorkspaceProgressRing({
  progress,
  size = 105,
  strokeWidth = 10,
  trackColor = 'var(--v3-primary-soft)',
  progressColor = 'var(--v3-primary)',
  className,
  children,
  'aria-label': ariaLabel,
}: WorkspaceProgressRingProps): JSX.Element {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  const offset = circumference - clamped * circumference;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      aria-label={ariaLabel}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 360ms cubic-bezier(0.2, 0, 0, 1)',
          }}
        />
      </svg>
      {children ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {children}
        </div>
      ) : null}
    </div>
  );
}
