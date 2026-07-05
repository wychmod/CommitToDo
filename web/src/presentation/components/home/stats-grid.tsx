import { useMemo } from 'react';
import { Calendar, CheckCircle2, Folder, Sparkles } from 'lucide-react';
import { type LucideIcon } from 'lucide-react';
import { Repository } from '../../../domain/entities/repository';
import { CountUp } from './count-up';
import { cn } from '../../../core/utils/formatters';

export interface StatsGridProps {
  repositories: Repository[];
  className?: string;
}

interface StatCard {
  id: string;
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  caption: string;
  icon: LucideIcon;
  /** value-=null means card shows an em-dash placeholder. */
  isPlaceholder?: boolean;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Four stat cards in a 2x2 (mobile) / 1x4 (desktop) grid. Numbers come from
 * real repository data when possible; the "tasks" card is intentionally a
 * TODO placeholder until we wire a task store reader.
 */
export function StatsGrid({ repositories, className }: StatsGridProps): JSX.Element {
  const stats = useMemo<StatCard[]>(() => {
    const today = startOfToday();

    const totalRepos = repositories.length;
    const activeToday = repositories.filter(
      (r) => r.updatedAt && isSameDay(new Date(r.updatedAt), today)
    ).length;

    const earliest = repositories.reduce<Date | null>((acc, r) => {
      const d = new Date(r.createdAt);
      if (!acc || d.getTime() < acc.getTime()) return d;
      return acc;
    }, null);

    const daysSinceEarliest = (() => {
      if (!earliest) return 0;
      const diff = today.getTime() - new Date(earliest).setHours(0, 0, 0, 0);
      return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    })();

    return [
      {
        id: 'repos',
        label: 'REPOSITORIES',
        value: totalRepos,
        caption: '已建仓库',
        icon: Folder,
      },
      {
        id: 'today',
        label: 'ACTIVE TODAY',
        value: activeToday,
        caption: activeToday === 0 ? '今天还没有活动' : '今日活跃仓库',
        icon: Sparkles,
      },
      {
        id: 'since',
        label: 'UPTIME',
        value: daysSinceEarliest,
        suffix: 'd',
        caption: earliest ? `自 ${earliest.toISOString().slice(0, 10)}` : '等待首次仓库',
        icon: Calendar,
      },
      {
        id: 'tasks',
        label: 'TASKS',
        // TODO: wire to a real task store when home exposes it.
        value: 0,
        caption: '待办需要任务模型接入',
        icon: CheckCircle2,
        isPlaceholder: true,
      },
    ];
  }, [repositories]);

  return (
    <section
      className={cn(
        'grid grid-cols-2 gap-sm laptop:grid-cols-4',
        'hud-rise hud-stagger-3',
        className
      )}
      aria-label="项目数据概览"
    >
      {stats.map((card) => (
        <div
          key={card.id}
          className={cn(
            'group flex flex-col gap-sm rounded-lg border border-hairline bg-surface-1 p-md hud-card',
            card.isPlaceholder && 'opacity-60'
          )}
        >
          {/* Header row */}
          <div className="flex items-center justify-between text-mono-sm text-ink-muted">
            <div className="flex items-center gap-xs">
              <card.icon className="h-3.5 w-3.5 text-ink-subtle" aria-hidden />
              <span className="tracking-widest">{card.label}</span>
            </div>
            <span className="text-ink-tertiary tabular">[ {String(stats.indexOf(card) + 1).padStart(2, '0')} ]</span>
          </div>

          {/* Big value */}
          <div className="flex items-baseline gap-xs">
            {card.isPlaceholder ? (
              <span className="text-display-md font-semibold leading-none tracking-tight text-ink-tertiary">
                —
              </span>
            ) : (
              <>
                <CountUp
                  value={card.value}
                  className="text-display-md font-semibold leading-none tracking-tight text-ink tabular"
                />
                {card.suffix ? (
                  <span className="text-headline font-medium text-ink-muted">{card.suffix}</span>
                ) : null}
              </>
            )}
          </div>

          {/* Caption */}
          <div className="mt-auto text-caption text-ink-subtle">{card.caption}</div>

          {/* Subtle baseline tick */}
          <div className="-mx-md -mb-md mt-sm h-px bg-hairline" aria-hidden />
        </div>
      ))}
    </section>
  );
}
