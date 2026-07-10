import { ArrowRight } from 'lucide-react';

import { commitList } from './workbench-demo-data';

export function CommitColumn(): JSX.Element {
  return (
    <div className="flex w-[280px] shrink-0 flex-col border-r border-[var(--v3-border)] py-4">
      <span className="mb-3 px-4 text-[12px] font-medium text-[var(--v3-text-strong)]">
        Commit
      </span>

      <div className="relative flex-1 px-4">
        <div className="relative flex flex-col gap-3">
          <div
            className="absolute bottom-[15px] left-[6px] top-[7px] w-px bg-gradient-to-b from-[var(--v3-primary)] via-[var(--v3-launch)] to-[var(--v3-launch)] opacity-80"
            aria-hidden="true"
          />

          {commitList.map((commit) => (
            <div key={commit.hash} className="relative pl-6">
              <div
                className="absolute left-0 top-1 z-[1] flex h-3 w-3 items-center justify-center rounded-full border-2"
                style={{
                  borderColor: commit.nodeColor,
                  backgroundColor: 'var(--v3-panel)',
                }}
                aria-hidden="true"
              />

              <div className="flex flex-col gap-0.5">
                <span className="text-[12px] text-[var(--v3-text-strong)]">
                  <span className="font-semibold">{commit.typePrefix}</span>{' '}
                  {commit.title}
                </span>

                <div className="flex items-center gap-3 text-[10px] text-[var(--v3-text-muted)]">
                  <span className="font-mono">{commit.hash}</span>
                  <span>{commit.time}</span>
                  <span>我</span>
                </div>

                {commit.branch && (
                  <span className="text-[10px] text-[var(--v3-text-faint)]">
                    {commit.branch}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="mt-4 flex items-center gap-1 pl-6 text-[12px] text-[var(--v3-text-secondary)] transition-colors hover:text-[var(--v3-primary)]"
        >
          <span>查看全部提交</span>
          <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
