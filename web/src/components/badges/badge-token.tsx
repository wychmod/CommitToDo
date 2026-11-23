import type { ReactNode } from 'react';
import { canonicalBadgeId, type BadgeCatalogId } from '@/core/rules/badge-catalog';
import { SvgIcon } from '@/ui/icons';
import styles from './badge-token.module.css';

type BadgeTone = 'sky' | 'coral' | 'iris' | 'honey' | 'mint';
type BadgeGlyph = 'pen' | 'branch' | 'merge' | 'milestone';

interface BadgeVisual {
  glyph: BadgeGlyph;
  tone: BadgeTone;
}

/** 每枚徽章的图形与底色（画稿 `me-data.mjs` 的 `badgeToken`）。 */
const VISUALS: Record<BadgeCatalogId, BadgeVisual> = {
  'first-commit': { glyph: 'pen', tone: 'sky' },
  'first-fork': { glyph: 'branch', tone: 'coral' },
  'first-milestone': { glyph: 'milestone', tone: 'honey' },
  'first-merge': { glyph: 'merge', tone: 'iris' },
  'all-merged': { glyph: 'merge', tone: 'iris' },
  'dual-lanes': { glyph: 'branch', tone: 'mint' },
  'let-go': { glyph: 'branch', tone: 'mint' },
  'well-ended': { glyph: 'merge', tone: 'sky' },
  'five-faces': { glyph: 'branch', tone: 'honey' },
  trunk: { glyph: 'branch', tone: 'coral' },
  backfill: { glyph: 'pen', tone: 'honey' },
  evergreen: { glyph: 'pen', tone: 'sky' },
  'first-year': { glyph: 'pen', tone: 'mint' },
  'three-milestones': { glyph: 'milestone', tone: 'iris' },
  'milestone-note': { glyph: 'milestone', tone: 'sky' },
  'year-marks': { glyph: 'milestone', tone: 'mint' },
  'night-flight': { glyph: 'pen', tone: 'iris' },
  'cross-year': { glyph: 'milestone', tone: 'honey' },
  'blank-year': { glyph: 'pen', tone: 'sky' },
  revival: { glyph: 'branch', tone: 'coral' },
  'full-moon': { glyph: 'milestone', tone: 'sky' },
};

const FALLBACK: BadgeVisual = { glyph: 'pen', tone: 'sky' };

const GLYPHS: Record<BadgeGlyph, ReactNode> = {
  pen: (
    <>
      <path d="m5 17-.6 3.4 3.4-.6L18.7 9l-2.8-2.8L5 17Z" />
      <path d="M14 8l2.8 2.8" />
      <path d="M12 20h8" />
    </>
  ),
  branch: (
    <>
      <circle cx="6" cy="5" r="2" />
      <circle cx="6" cy="19" r="2" />
      <circle cx="18" cy="7" r="2" />
      <path d="M6 7v10m12-8c0 4-2 6-6 6H6" />
    </>
  ),
  merge: (
    <>
      <circle cx="5" cy="5" r="2" />
      <circle cx="5" cy="19" r="2" />
      <circle cx="19" cy="19" r="2" />
      <path d="M5 7v10m14 0v-3a6 6 0 0 0-6-6H6" />
    </>
  ),
  milestone: (
    <>
      <path d="m12 3 8 9-8 9-8-9 8-9Z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
};

type BadgeTokenSize = 'sm' | 'md' | 'lg';

const SIZE_CLASS: Record<BadgeTokenSize, string> = {
  sm: styles.small,
  md: styles.medium,
  lg: styles.large,
};

const ICON_SIZE: Record<BadgeTokenSize, 18 | 24> = {
  sm: 18,
  md: 24,
  lg: 24,
};

/** 自绘徽章图形：名称旁的小圆牌，已获得才有。 */
export function BadgeToken({
  catalogId,
  size = 'sm',
}: {
  catalogId: string;
  size?: BadgeTokenSize;
}) {
  const canonical = canonicalBadgeId(catalogId);
  const visual = canonical ? VISUALS[canonical] : FALLBACK;

  return (
    <span
      className={`${styles.token} ${SIZE_CLASS[size]}`}
      data-tone={visual.tone}
      aria-hidden="true"
    >
      <SvgIcon size={ICON_SIZE[size]}>{GLYPHS[visual.glyph]}</SvgIcon>
    </span>
  );
}
