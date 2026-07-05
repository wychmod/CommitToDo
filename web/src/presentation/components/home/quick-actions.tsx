import {
  ChevronRight,
  Folder,
  ListTodo,
  Plus,
  Network,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../../core/utils/formatters';
import { useIsMobile } from '../../../core/hooks/use-is-mobile';
import { useState } from 'react';
import { BottomSheet } from '../common/bottom-sheet';

export interface QuickActionsProps {
  onCreateRepository: () => void;
  className?: string;
}

interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  to?: string;
  onClick?: () => void;
  primary?: boolean;
}

const ACTIONS: QuickAction[] = [
  { id: 'repo', label: '新建仓库', icon: Folder, primary: true },
  { id: 'task', label: '新建任务', icon: ListTodo },
  { id: 'graph', label: '分支图', icon: Network, to: '/graph' },
  { id: 'heatmap', label: '热力图', icon: BarChart3, to: '/heatmap' },
];

/**
 * Quick action surface:
 *  - desktop / tablet: a row of outline "chip" buttons under the hero
 *  - mobile: a single primary anchor + a bottom-sheet that opens the full
 *    action list (so we don't clutter the small screen)
 */
export function QuickActions({
  onCreateRepository,
  className,
}: QuickActionsProps): JSX.Element {
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleClick = (a: QuickAction): void => {
    if (a.id === 'repo') {
      onCreateRepository();
      return;
    }
    if (a.to) {
      // Link handles navigation; this branch only runs if we ever call it
      // programmatically (currently we don't).
      window.location.assign(a.to);
    }
  };

  if (isMobile) {
    return (
      <>
        <div className={cn('hud-rise hud-stagger-5', className)}>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex h-12 w-full items-center justify-center gap-xs rounded-md bg-primary text-button font-medium text-on-primary shadow-md transition-transform active:scale-[0.99]"
            aria-label="打开快捷操作"
          >
            <Plus className="h-4 w-4" />
            <span>新建 / 快捷操作</span>
            <ChevronRight className="h-4 w-4 opacity-70" />
          </button>
        </div>

        <BottomSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title="快捷操作"
          description="选择想要执行的动作"
        >
          <div className="flex flex-col">
            {ACTIONS.map((a) => {
              const Inner = (
                <span className="flex items-center gap-sm">
                  <a.icon className="h-4 w-4 text-ink-muted" aria-hidden />
                  <span className="text-body text-ink">{a.label}</span>
                </span>
              );
              if (a.to) {
                return (
                  <Link
                    key={a.id}
                    to={a.to}
                    onClick={() => setSheetOpen(false)}
                    className="flex items-center justify-between border-b border-hairline py-md text-left transition-colors hover:bg-surface-2"
                  >
                    {Inner}
                    <ChevronRight className="h-4 w-4 text-ink-subtle" />
                  </Link>
                );
              }
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    setSheetOpen(false);
                    handleClick(a);
                  }}
                  className="flex items-center justify-between border-b border-hairline py-md text-left transition-colors hover:bg-surface-2"
                >
                  {Inner}
                  <ChevronRight className="h-4 w-4 text-ink-subtle" />
                </button>
              );
            })}
          </div>
        </BottomSheet>
      </>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-sm hud-rise hud-stagger-5',
        className
      )}
    >
      {ACTIONS.map((a) => {
        const content = (
          <span className="flex items-center gap-xs">
            <a.icon className="h-3.5 w-3.5" aria-hidden />
            <span>{a.label}</span>
          </span>
        );
        const baseClass = cn(
          'inline-flex h-10 items-center gap-xs rounded-md border px-md text-button font-medium transition-colors',
          a.primary
            ? 'border-primary bg-primary text-on-primary hover:bg-primary-hover'
            : 'border-hairline bg-surface-1 text-ink hover:border-hairline-strong hover:bg-surface-2'
        );

        if (a.to) {
          return (
            <Link key={a.id} to={a.to} className={baseClass}>
              {content}
            </Link>
          );
        }
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => handleClick(a)}
            className={baseClass}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
