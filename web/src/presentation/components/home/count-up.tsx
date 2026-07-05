import { useEffect, useRef, useState } from 'react';

export interface CountUpProps {
  /** Target numeric value to count up to. Strings get coerced. */
  value: number | string;
  /** Animation duration in ms. */
  duration?: number;
  /** Number of decimal places to render (clamped 0–2). */
  decimals?: number;
  /** Optional formatter applied to the final value (after decimals). */
  format?: (value: number) => string;
  /** Extra className for the rendered span. */
  className?: string;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/**
 * Animated numeric counter. Renders the current frame inside a span so it
 * plays nicely with the surrounding layout (no layout shift from re-renders).
 */
export function CountUp({
  value,
  duration = 1100,
  decimals = 0,
  format,
  className,
}: CountUpProps): JSX.Element {
  const target = typeof value === 'number' ? value : Number(value) || 0;
  const [display, setDisplay] = useState<number>(prefersReducedMotion() ? target : 0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplay(target);
      return undefined;
    }

    startRef.current = null;
    const tick = (now: number): void => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOutExpo(progress);
      setDisplay(target * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(target);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  const text = format
    ? format(display)
    : display.toFixed(decimals).replace(/\.0+$/, '');

  return <span className={className}>{text}</span>;
}
