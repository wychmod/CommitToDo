import { useBreakpoint } from '@/core/hooks/use-breakpoint';
import { BranchColumn } from './branch-column';
import { CommitColumn } from './commit-column';
import { HeatmapColumn } from './heatmap-column';
import { RepositoryColumn } from './repository-column';
import { TaskColumn } from './task-column';

export function WorkbenchPreview(): JSX.Element {
  const { isTablet } = useBreakpoint();

  return (
    <section
      className="v3-enter v3-enter-delay-7 relative mx-auto mt-0 px-5 tablet:px-8 desktop-xl:px-0"
      aria-label="CommitToDo 工作台预览"
    >
      <div
        className={`relative mx-auto rounded-[12px] border border-[var(--v3-border)] bg-[var(--v3-panel)] shadow-[var(--v3-shadow-panel)] ${
          isTablet ? 'overflow-x-auto' : 'overflow-hidden'
        }`}
        style={{ maxWidth: '1328px' }}
      >
        <div
          className="flex h-[482px] min-w-[1080px]"
          aria-hidden="true"
        >
          <RepositoryColumn />
          <BranchColumn />
          <TaskColumn />
          <CommitColumn />
          <HeatmapColumn />
        </div>
      </div>
    </section>
  );
}
