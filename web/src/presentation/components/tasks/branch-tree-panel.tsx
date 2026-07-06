import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  ListTodo,
  Plus,
  GitBranch as GitBranchIcon,
  GitMerge,
  Trash2,
} from 'lucide-react';
import { Branch } from '../../../domain/entities/branch';
import { TaskStatus } from '../../../domain/entities/enums';
import { cn } from '../../../core/utils/formatters';

export type TaskFilterView = 'all' | 'today' | 'pending-commit' | 'completed';

export interface BranchTreePanelProps {
  branches: Branch[];
  activeBranchId: string | null;
  tasks: Array<{ status: TaskStatus; branchId: string }>;
  /** When true, the panel collapses to a rail (icons only) on narrow viewports */
  collapsed?: boolean;
  onSelectBranch: (branch: Branch) => void;
  onCreateBranch?: () => void;
  onMergeBranch?: (branch: Branch) => void;
  onDeleteBranch?: (branch: Branch) => void;
  view: TaskFilterView;
  onChangeView: (view: TaskFilterView) => void;
}

const VIEW_OPTIONS: Array<{
  id: TaskFilterView;
  label: string;
  icon: typeof ListTodo;
}> = [
  { id: 'all', label: '全部任务', icon: ListTodo },
  { id: 'today', label: '今天', icon: Circle },
  { id: 'pending-commit', label: '待提交', icon: GitBranchIcon },
  { id: 'completed', label: '已完成', icon: CheckCircle2 },
];

/**
 * Left-side context panel for the repository work surface. Replaces the old
 * "left-sidebar global nav" role with repository-local context: a branch list
 * at the top and a view selector below it.
 */
export function BranchTreePanel({
  branches,
  activeBranchId,
  tasks,
  collapsed = false,
  onSelectBranch,
  onCreateBranch,
  onMergeBranch,
  onDeleteBranch,
  view,
  onChangeView,
}: BranchTreePanelProps): JSX.Element {
  const counts = useMemo(() => {
    const map = new Map<string, { total: number; active: number; done: number }>();
    tasks.forEach((t) => {
      const bucket = map.get(t.branchId) ?? { total: 0, active: 0, done: 0 };
      bucket.total += 1;
      if (t.status === TaskStatus.inProgress) bucket.active += 1;
      if (t.status === TaskStatus.done) bucket.done += 1;
      map.set(t.branchId, bucket);
    });
    return map;
  }, [tasks]);

  const allTotal = tasks.length;
  const allActive = tasks.filter((t) => t.status === TaskStatus.inProgress).length;
  const allDone = tasks.filter((t) => t.status === TaskStatus.done).length;

  if (collapsed) {
    return (
      <aside className="context-panel" data-collapsed="true" aria-hidden="true" />
    );
  }

  return (
    <aside className="context-panel" aria-label="分支与视图">
      <div className="filter-group">
        <div className="flex items-center justify-between">
          <span className="filter-group-label">视图</span>
        </div>
        {VIEW_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isActive = opt.id === view;
          return (
            <button
              key={opt.id}
              type="button"
              className="filter-pill"
              data-active={isActive}
              onClick={() => onChangeView(opt.id)}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              <span className="flex-1">{opt.label}</span>
              <span className="font-mono text-[11px] text-ink-subtle">
                {opt.id === 'all'
                  ? allTotal
                  : opt.id === 'completed'
                    ? allDone
                    : opt.id === 'pending-commit'
                      ? allActive
                      : allActive + allDone}
              </span>
            </button>
          );
        })}
      </div>

      <div className="filter-group">
        <div className="flex items-center justify-between">
          <span className="filter-group-label">分支</span>
          {onCreateBranch ? (
            <button
              type="button"
              onClick={onCreateBranch}
              aria-label="新建分支"
              className="inline-flex h-6 w-6 items-center justify-center rounded text-ink-subtle transition-colors hover:bg-surface hover:text-ink"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
        {branches.length === 0 ? (
          <p className="filter-pill text-ink-subtle">暂无分支</p>
        ) : (
          branches.map((branch) => {
            const count = counts.get(branch.id) ?? { total: 0, active: 0, done: 0 };
            const isActive = branch.id === activeBranchId;
            return (
              <BranchRow
                key={branch.id}
                branch={branch}
                active={isActive}
                count={count.total}
                onSelect={() => onSelectBranch(branch)}
                onMerge={isActive && !branch.isMain ? onMergeBranch : undefined}
                onDelete={isActive && !branch.isMain ? onDeleteBranch : undefined}
              />
            );
          })
        )}
      </div>

      <div className="mt-auto border-t border-border-quiet p-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-subtle">
          Branch as context
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          分支是仓库内的工作上下文。点击切换不会跳转页面，列表与详情会同步刷新。
        </p>
      </div>
    </aside>
  );
}

interface BranchRowProps {
  branch: Branch;
  active: boolean;
  count: number;
  onSelect: () => void;
  onMerge?: (branch: Branch) => void;
  onDelete?: (branch: Branch) => void;
}

function BranchRow({
  branch,
  active,
  count,
  onSelect,
  onMerge,
  onDelete,
}: BranchRowProps): JSX.Element {
  const [hover, setHover] = useState(false);
  return (
    <div
      className={cn('group relative')}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        className="branch-row"
        data-active={active}
        onClick={onSelect}
        aria-label={`${branch.name}${branch.isMain ? '，主分支' : ''}，${count} 个任务`}
      >
        <span
          className="branch-row-marker"
          style={{ backgroundColor: branch.color }}
          aria-hidden
        />
        <span className="branch-row-name">
          {branch.name}
          {branch.isMain ? (
            <span
              className="ml-1 align-middle font-mono text-[10px] text-ink-subtle"
              aria-hidden="true"
            >
              main
            </span>
          ) : null}
        </span>
        <span className="branch-row-meta">{count}</span>
      </button>
      {(hover && (onMerge || onDelete)) ? (
        <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5 rounded border border-border bg-canvas-elevated px-0.5 py-0.5">
          {onMerge ? (
            <button
              type="button"
              onClick={() => onMerge(branch)}
              aria-label="合并到 main"
              className="rounded p-1 text-ink-subtle transition-colors hover:bg-surface hover:text-primary"
            >
              <GitMerge className="h-3 w-3" aria-hidden />
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(branch)}
              aria-label="删除分支"
              className="rounded p-1 text-ink-subtle transition-colors hover:bg-error-soft hover:text-error"
            >
              <Trash2 className="h-3 w-3" aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
