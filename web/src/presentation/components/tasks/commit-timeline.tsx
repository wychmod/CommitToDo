import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { container } from '../../../core/di/injection-container';
import { ICommitRepository } from '../../../domain/repositories/i-commit-repository';
import { Commit } from '../../../domain/entities/commit';
import { CommitType } from '../../../domain/entities/enums';
import { formatDateTime } from '../../../core/utils/formatters';

export interface CommitTimelineProps {
  branchIds: string[];
  title?: string;
}

/**
 * Vertical commit timeline used on the per-repository Commits tab. Each commit
 * is drawn as a compact row with a vertical connector and a status-coloured
 * marker — designed to scan quickly without big card chrome.
 */
export function CommitTimeline({ branchIds, title }: CommitTimelineProps): JSX.Element {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async (): Promise<void> => {
      if (branchIds.length === 0) {
        setCommits([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const repo = container.resolve<ICommitRepository>('ICommitRepository');
      const lists = await Promise.all(
        branchIds.map((id) => repo.getByBranchId(id))
      );
      if (cancelled) return;
      const merged = lists
        .flat()
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setCommits(merged);
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [branchIds]);

  const grouped = useMemo(() => {
    const map = new Map<string, Commit[]>();
    commits.forEach((c) => {
      const day = c.createdAt.toISOString().slice(0, 10);
      const list = map.get(day) ?? [];
      list.push(c);
      map.set(day, list);
    });
    return Array.from(map.entries());
  }, [commits]);

  return (
    <section
      className="overflow-hidden rounded-lg border border-border bg-surface"
      aria-label={title ?? '提交记录'}
    >
      {title ? (
        <header className="panel-header">
          <span className="panel-title">提交记录</span>
          <span className="panel-meta">{commits.length} 条</span>
        </header>
      ) : null}
      {isLoading ? (
        <div className="flex items-center gap-2 px-md py-lg text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> 正在加载…
        </div>
      ) : commits.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-title">暂无提交记录</span>
          <span className="empty-state-caption">
            完成任务、新建分支或合并后会在这里留痕。
          </span>
        </div>
      ) : (
        grouped.map(([day, list]) => (
          <div key={day}>
            <header className="border-b border-border-quiet bg-canvas-elevated px-md py-xs text-[11px] font-mono uppercase tracking-[0.08em] text-ink-subtle">
              {day}
            </header>
            {list.map((c) => (
              <CommitRow key={c.id} commit={c} />
            ))}
          </div>
        ))
      )}
    </section>
  );
}

interface CommitRowProps {
  commit: Commit;
}

function CommitRow({ commit }: CommitRowProps): JSX.Element {
  const typeKey = commit.type.toString();
  return (
    <div className="commit-row">
      <div className="commit-row-gutter">
        <span className="commit-row-marker" data-type={typeKey} />
      </div>
      <div>
        <p className="commit-row-message">{commit.message}</p>
        <p className="commit-row-meta">
          <span>{CommitType.label(commit.type)}</span>
          <span>·</span>
          <span>{formatDateTime(commit.createdAt)}</span>
          <span>·</span>
          <span className="font-mono">#{commit.id.slice(0, 7)}</span>
        </p>
      </div>
      <span />
    </div>
  );
}
