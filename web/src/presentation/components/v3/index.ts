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
