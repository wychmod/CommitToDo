import { AlertCircle } from 'lucide-react';

import { cn } from '@/core/utils/formatters';
import { V3Button } from './v3-button';

export interface V3ErrorStateProps {
  title?: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Error state primitive for the v3 design language.
 *
 * Always provides a retry action when `onRetry` is supplied, satisfying the
 * audit rule that error states must allow the user to recover.
 */
export function V3ErrorState({
  title = '加载失败',
  description = '无法获取数据，请检查网络或稍后重试。',
  retryLabel = '重试',
  onRetry,
  className,
}: V3ErrorStateProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-[var(--v3-radius-md)] border border-[var(--v3-danger)]/30 bg-[var(--v3-danger)]/10 p-8 text-center',
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--v3-danger)]/10">
        <AlertCircle
          size={20}
          strokeWidth={1.5}
          aria-hidden="true"
          className="text-[var(--v3-danger)]"
        />
      </div>
      <p className="text-[16px] font-medium text-[var(--v3-text-strong)]">{title}</p>
      {description ? (
        <p className="max-w-[280px] text-[14px] leading-[1.55] text-[var(--v3-text-secondary)]">
          {description}
        </p>
      ) : null}
      {onRetry ? (
        <V3Button onClick={onRetry} className="mt-1">{retryLabel}</V3Button>
      ) : null}
    </div>
  );
}
