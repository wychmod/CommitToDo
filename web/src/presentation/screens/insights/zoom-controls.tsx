import { Plus, Minus } from 'lucide-react';

import { V3IconButton } from '@/presentation/components/v3';

export interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  className?: string;
}

export function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  className,
}: ZoomControlsProps): JSX.Element {
  return (
    <div
      className={`flex w-[42px] flex-col overflow-hidden rounded-[var(--v3-radius-lg)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)] ${className ?? ''}`}
      aria-label="图谱缩放控制"
    >
      <V3IconButton
        type="button"
        onClick={onZoomIn}
        aria-label="放大"
        className="h-[42px] w-full rounded-none border-b border-[var(--v3-divider)]"
      >
        <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
      </V3IconButton>

      <button
        type="button"
        onClick={onReset}
        className="h-[42px] w-full text-[11px] font-medium text-[var(--v3-text-secondary)] transition-colors hover:bg-[var(--v3-control)] hover:text-[var(--v3-text-strong)]"
        aria-label="重置缩放"
      >
        {Math.round(zoom * 100)}%
      </button>

      <V3IconButton
        type="button"
        onClick={onZoomOut}
        aria-label="缩小"
        className="h-[42px] w-full rounded-none border-t border-[var(--v3-divider)]"
      >
        <Minus size={16} strokeWidth={1.5} aria-hidden="true" />
      </V3IconButton>
    </div>
  );
}
