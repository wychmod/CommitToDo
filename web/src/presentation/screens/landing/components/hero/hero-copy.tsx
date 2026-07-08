export function HeroCopy(): JSX.Element {
  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="v3-enter v3-enter-delay-2 text-[40px] font-bold leading-[1.05] text-[var(--v3-text-strong)] desktop:text-[56px]">
        CommitToDo
      </h1>

      <p className="v3-enter v3-enter-delay-3 mt-4 text-[30px] font-bold leading-[1.2] text-[var(--v3-text-strong)] desktop:text-[40px]">
        把目标分支化，把进展
        <span className="text-[var(--v3-primary)]">提交</span>
        掉
      </p>

      <p className="v3-enter v3-enter-delay-4 mt-3 max-w-[560px] text-[17px] leading-[1.55] text-[var(--v3-text-secondary)]">
        用仓库组织目标，用分支推进任务，每次完成都有记录。
      </p>
    </div>
  );
}
