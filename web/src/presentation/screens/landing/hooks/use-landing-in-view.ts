import { useEffect, useRef, useState } from 'react';

export function useLandingInView(threshold = 0.75): {
  ref: React.RefObject<HTMLDivElement>;
  isInView: boolean;
} {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    let triggered = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !triggered) {
          triggered = true;
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  return { ref, isInView };
}
