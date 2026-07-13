import { GitBranch } from 'lucide-react';

/**
 * Brand header for the auth dialog: a white inverted logo block + wordmark.
 *
 * Deliberately contains no link or button so it adds no extra focus stop
 * inside the modal. The close button is positioned separately by the dialog.
 */
export function AuthBrandHeader(): JSX.Element {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-[var(--v3-radius-md)] bg-[var(--v3-text-strong)] text-[var(--v3-bg)]">
        <GitBranch size={16} strokeWidth={1.5} aria-hidden="true" />
      </span>
      <span className="text-[18px] font-semibold tracking-tight text-[var(--v3-text-strong)]">
        CommitToDo
      </span>
    </div>
  );
}
