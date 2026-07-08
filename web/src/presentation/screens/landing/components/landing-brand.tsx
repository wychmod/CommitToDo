export function LandingBrand(): JSX.Element {
  return (
    <a
      href="/"
      className="flex items-center gap-[10px] focus-visible:outline-none focus-visible:[box-shadow:var(--v3-focus-ring)] rounded-md"
      aria-label="CommitToDo 首页"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-[var(--v3-text-strong)]">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="6" cy="6" r="2.5" fill="var(--v3-bg)" />
          <circle cx="6" cy="18" r="2.5" fill="var(--v3-bg)" />
          <circle cx="18" cy="12" r="2.5" fill="var(--v3-bg)" />
          <path
            d="M6 8v8"
            stroke="var(--v3-bg)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M8 6h3c2.5 0 4 1.5 4 4v0c0 1.5 1 2.5 3 2.5h2"
            stroke="var(--v3-bg)"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
      <span className="text-[17px] font-semibold text-[var(--v3-text-strong)]">
        CommitToDo
      </span>
    </a>
  );
}
