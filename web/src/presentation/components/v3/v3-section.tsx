import * as React from 'react';

import { useInView } from '@/core/hooks/use-in-view';
import { cn } from '@/core/utils/formatters';
import { V3_CONTENT_MAX_WIDTH } from '@/core/theme/v3-tokens';

/**
 * Section shell for the v3 design language.
 *
 * Encodes the Landing page's section rhythm: full-bleed `<section>` with
 * vertical padding, wrapping a centered content column capped at
 * `--v3-content` (1328px) with responsive horizontal gutters. Set `reveal` to
 * fade-and-rise the section into view on scroll, matching the `.v3-reveal`
 * cadence (520ms / 18px).
 */
export interface V3SectionProps extends React.HTMLAttributes<HTMLElement> {
  /** Render the centered max-width content column (default true). */
  contained?: boolean;
  /** Apply the standard vertical rhythm `py-20` (default true). */
  padded?: boolean;
  /** Fade-and-rise into view on scroll (default false). */
  reveal?: boolean;
  /** Visibility ratio that triggers the reveal (default 0.25). */
  revealThreshold?: number;
  /** Class for the inner content column (when `contained`). */
  containerClassName?: string;
}

export const V3Section = React.forwardRef<HTMLElement, V3SectionProps>(
  (
    {
      className,
      containerClassName,
      contained = true,
      padded = true,
      reveal = false,
      revealThreshold = 0.25,
      children,
      ...props
    },
    forwardedRef
  ) => {
    const { ref: inViewRef, isInView } = useInView<HTMLElement>(revealThreshold);

    // Merge the forwarded ref with the in-view observer ref.
    const setRef = (node: HTMLElement | null) => {
      inViewRef.current = node;
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef)
        (forwardedRef as React.MutableRefObject<HTMLElement | null>).current =
          node;
    };
    return (
      <section
        ref={reveal ? setRef : forwardedRef}
        className={cn(
          'relative',
          padded && 'py-20',
          reveal &&
            'transition-[opacity,transform] duration-500 ease-(--v3-ease-enter)',
          reveal && (isInView ? 'translate-y-0 opacity-100' : 'translate-y-[18px] opacity-0'),
          className
        )}
        {...props}
      >
        {contained ? (
          <div
            className={cn(
              'relative mx-auto px-5 desktop:px-0',
              containerClassName
            )}
            style={{ maxWidth: V3_CONTENT_MAX_WIDTH }}
          >
            {children}
          </div>
        ) : (
          children
        )}
      </section>
    );
  }
);
V3Section.displayName = 'V3Section';
