import { useEffect, useRef, useState } from 'react';

/**
 * Reusable IntersectionObserver hook for scroll-triggered reveals.
 *
 * Generalized from the Landing page's `useLandingInView` so any new v3 page can
 * opt into the same reveal rhythm without re-implementing the observer. Once the
 * element enters the viewport at the given `threshold`, `isInView` flips to
 * `true` and the observer disconnects (the reveal is one-shot).
 *
 * @param threshold Visibility ratio that triggers the reveal (0-1). Default 0.25.
 * @param once      When false, re-observes so `isInView` toggles with visibility.
 *                  Default true (one-shot, matches the Landing reveal behavior).
 *
 * @example
 * const { ref, isInView } = useInView(0.25);
 * <section ref={ref} className={cn('transition', isInView && 'opacity-100')} />
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.25,
  once = true
): {
  ref: React.MutableRefObject<T | null>;
  isInView: boolean;
} {
  const ref = useRef<T | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    if (typeof IntersectionObserver === 'undefined') {
      // Graceful fallback for non-browser/test environments: show immediately.
      setIsInView(true);
      return undefined;
    }

    let triggered = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          if (once && triggered) return;
          triggered = true;
          setIsInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setIsInView(false);
        }
      },
      { threshold }
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [threshold, once]);

  return { ref, isInView };
}
