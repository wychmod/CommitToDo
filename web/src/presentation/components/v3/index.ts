/**
 * v3 design-system primitives for NEW pages.
 *
 * These components encode the Landing page's visual language as reusable,
 * self-contained building blocks. They read the `--v3-*` tokens (see
 * `@/core/theme/v3-tokens.css`) and do NOT depend on `landing-theme.css`.
 *
 * See `docs/v3/STYLE_GUIDE.md` for the full usage contract.
 *
 * Usage:
 *   import '@/core/theme/v3-tokens.css';
 *   import { V3Button, V3Card, V3Section } from '@/presentation/components/v3';
 */
export { V3Button, v3ButtonVariants } from './v3-button';
export type { V3ButtonProps } from './v3-button';

export { V3IconButton } from './v3-icon-button';
export type { V3IconButtonProps } from './v3-icon-button';

export { V3Card } from './v3-card';
export type { V3CardProps, V3CardAccent } from './v3-card';

export { V3Section } from './v3-section';
export type { V3SectionProps } from './v3-section';

export { V3NavLink } from './v3-nav-link';
export type { V3NavLinkProps } from './v3-nav-link';

export { V3AppShell } from './v3-app-shell';
export type { V3AppShellProps } from './v3-app-shell';

export { V3TopCommandBar } from './v3-top-command-bar';
export type { V3TopCommandBarProps } from './v3-top-command-bar';

export { V3LeftNavigation } from './v3-left-navigation';
export type { V3LeftNavigationProps } from './v3-left-navigation';

export { V3BottomStatusBar } from './v3-bottom-status-bar';
export type { V3BottomStatusBarProps } from './v3-bottom-status-bar';

export { V3NewMenu } from './v3-new-menu';
export type { V3NewMenuProps } from './v3-new-menu';

export { V3EmptyState } from './v3-empty-state';
export type { V3EmptyStateProps } from './v3-empty-state';

export { V3LoadingState } from './v3-loading-state';
export type { V3LoadingStateProps } from './v3-loading-state';

export { V3ErrorState } from './v3-error-state';
export type { V3ErrorStateProps } from './v3-error-state';
