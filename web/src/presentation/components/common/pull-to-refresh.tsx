import * as React from 'react';
import { cn } from '../../../core/utils/formatters';

export interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
}

export function PullToRefresh({
  onRefresh,
  children,
  className,
}: PullToRefreshProps): JSX.Element {
  const [pulling, setPulling] = React.useState(false);
  const [distance, setDistance] = React.useState(0);
  const startY = React.useRef(0);
  const refreshing = React.useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY > 0) return;
    startY.current = e.touches[0].clientY;
    refreshing.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (window.scrollY > 0) return;
    const y = e.touches[0].clientY;
    const delta = y - startY.current;
    if (delta > 0 && delta < 120) {
      setPulling(true);
      setDistance(delta);
    }
  };

  const onTouchEnd = async () => {
    if (distance > 60 && !refreshing.current) {
      refreshing.current = true;
      setPulling(true);
      try {
        await onRefresh();
      } finally {
        setPulling(false);
        setDistance(0);
        refreshing.current = false;
      }
    } else {
      setPulling(false);
      setDistance(0);
    }
  };

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-12 items-center justify-center text-body-sm text-ink-muted transition-transform"
        style={{ transform: `translateY(${Math.min(distance, 60) - 48}px)` }}
      >
        {pulling ? '松开刷新' : '下拉刷新'}
      </div>
      <div
        style={{
          transform: pulling ? `translateY(${Math.min(distance, 60)}px)` : 'translateY(0)',
          transition: pulling ? undefined : 'transform 200ms ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
