export function LandingFooter(): JSX.Element {
  return (
    <footer className="border-t border-[var(--v3-divider)] bg-[var(--v3-bg)]">
      <div className="mx-auto flex h-auto max-w-[1328px] flex-col items-start justify-between gap-3 px-5 py-5 tablet:h-[66px] tablet:flex-row tablet:items-center tablet:gap-0 tablet:py-0">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-[var(--v3-text-strong)]">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle cx="6" cy="6" r="2" fill="var(--v3-bg)" />
              <circle cx="6" cy="18" r="2" fill="var(--v3-bg)" />
              <circle cx="18" cy="12" r="2" fill="var(--v3-bg)" />
              <path
                d="M6 8v8"
                stroke="var(--v3-bg)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M8 6h3c2.5 0 4 1.5 4 4v0c0 1.5 1 2.5 3 2.5h2"
                stroke="var(--v3-bg)"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>
          <span className="text-[11px] font-semibold text-[var(--v3-text-strong)]">
            CommitToDo
          </span>
        </div>

        <span className="font-mono text-[10px] text-[var(--v3-text-muted)]">
          Local-first • PWA • IndexedDB
        </span>

        <span className="text-[10px] text-[var(--v3-text-faint)]">
          数据默认保存在你的设备
        </span>
      </div>
    </footer>
  );
}
