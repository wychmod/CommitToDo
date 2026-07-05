import { useEffect, useState } from 'react';
import { cn } from '../../../core/utils/formatters';

export interface HeroBlockProps {
  title: string;
  subtitle: string;
  className?: string;
}

function partOfDay(date: Date): 'morning' | 'afternoon' | 'evening' {
  const h = date.getHours();
  if (h < 6) return 'evening';
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

/**
 * Editorial hero block — eyebrow marker, large title, subtitle, and a
 * technical-looking status line. Anchored with a faint dot grid in the back
 * for the "engineering instrument" feel, with a sweep scan-line overlay.
 */
export function HeroBlock({ title, subtitle, className }: HeroBlockProps): JSX.Element {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const greetZh: Record<ReturnType<typeof partOfDay>, string> = {
    morning: '早上好',
    afternoon: '下午好',
    evening: '晚上好',
  };

  const pad = (n: number): string => n.toString().padStart(2, '0');
  const stamp = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} · ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  return (
    <section
      className={cn(
        'relative isolate overflow-hidden rounded-xl border border-hairline bg-surface-1 px-lg pb-xl pt-xl',
        'hud-scan hud-rise hud-stagger-2',
        className
      )}
    >
      {/* Faint dot grid — uses currentColor at low opacity */}
      <div className="dot-grid pointer-events-none absolute inset-0 text-ink-muted opacity-50" aria-hidden />

      {/* Soft primary glow in top-right corner (minimal, not neon) */}
      <div
        className="pointer-events-none absolute -right-32 -top-32 h-64 w-64 rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(closest-side, color-mix(in oklab, var(--color-primary) 28%, transparent), transparent 70%)',
        }}
        aria-hidden
      />

      <div className="relative flex flex-col gap-md">
        {/* Eyebrow */}
        <div className="flex items-center gap-sm text-mono-sm text-ink-subtle">
          <span className="inline-flex h-5 items-center rounded-sm border border-primary/40 bg-primary/10 px-2 font-medium text-primary">
            01
          </span>
          <span className="tracking-widest">OVERVIEW</span>
          <span className="hidden text-ink-tertiary tablet:inline">//</span>
          <span className="hidden text-ink-tertiary tablet:inline tabular">
            {stamp}
          </span>
        </div>

        {/* Title */}
        <h1
          className="text-display-xl font-semibold leading-none tracking-tight text-ink"
          style={{ letterSpacing: '-0.04em' }}
        >
          {title}
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl text-body-lg text-ink-muted">
          {subtitle}
        </p>

        {/* System status line */}
        <div className="mt-xs flex flex-wrap items-center gap-sm text-mono-sm text-ink-subtle">
          <span className="text-primary">&gt;</span>
          <span>sys.nominal</span>
          <span className="text-ink-tertiary">_</span>
          <span>{greetZh[partOfDay(now)]}，dev</span>
          <span className="text-ink-tertiary">·</span>
          <span className="inline-flex items-center gap-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-success hud-pulse" aria-hidden />
            <span className="text-success">all.green</span>
          </span>
          <span className="hud-cursor text-ink" />
        </div>
      </div>
    </section>
  );
}
