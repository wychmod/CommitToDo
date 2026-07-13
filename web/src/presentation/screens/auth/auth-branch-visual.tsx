/**
 * Decorative Git branch visual for the auth dialog.
 *
 * A self-contained inline SVG (not an image, not a copy of the landing
 * particle canvas). Three branch paths - primary, launch (cyan) and a low-
 * contrast neutral - with nodes and a commit-check node on the right. All
 * color comes from `--v3-*` tokens. It is purely decorative: `aria-hidden`,
 * not focusable, one-shot fade-in only (no infinite animation).
 */
export function AuthBranchVisual(): JSX.Element {
  return (
    <svg
      className="auth-branch"
      viewBox="0 0 300 44"
      width="100%"
      height="44"
      fill="none"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Main branch (primary) */}
      <path
        d="M8 22 H182"
        stroke="var(--v3-primary)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Launch branch (cyan): forks up */}
      <path
        d="M58 22 C58 12 66 8 76 8 H196"
        stroke="var(--v3-launch)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Neutral branch: forks down */}
      <path
        d="M100 22 C100 32 108 36 118 36 H206"
        stroke="var(--v3-text-faint)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Merge back into main */}
      <path
        d="M196 8 C206 8 214 12 214 22"
        stroke="var(--v3-launch)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Nodes */}
      <circle cx="8" cy="22" r="3.5" fill="var(--v3-primary)" />
      <circle cx="58" cy="22" r="3" fill="var(--v3-launch)" />
      <circle cx="76" cy="8" r="3" fill="var(--v3-launch)" />
      <circle cx="100" cy="22" r="3" fill="var(--v3-text-muted)" />
      <circle cx="118" cy="36" r="3" fill="var(--v3-text-muted)" />
      <circle cx="206" cy="36" r="3" fill="var(--v3-text-muted)" />
      <circle cx="214" cy="22" r="3.5" fill="var(--v3-launch)" />

      {/* Commit-check node (right) */}
      <circle cx="252" cy="22" r="8" fill="var(--v3-primary)" />
      <path
        d="M248.5 22 L251 24.5 L256 19.5"
        stroke="var(--v3-text-on-primary)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
