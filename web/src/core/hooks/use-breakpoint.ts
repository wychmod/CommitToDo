import { useEffect, useState } from 'react';
import {
  DESKTOP_BREAKPOINT,
  DESKTOP_XL_BREAKPOINT,
  MOBILE_BREAKPOINT,
  SPLIT_BREAKPOINT,
} from '../theme/dimensions';

export interface BreakpointState {
  isMobile: boolean;
  isMobileLg: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isDesktopXl: boolean;
  isWide: boolean;
  width: number;
}

export function useBreakpoint(): BreakpointState {
  const [width, setWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 0
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    isMobile: width < MOBILE_BREAKPOINT,
    isMobileLg: width >= MOBILE_BREAKPOINT && width < SPLIT_BREAKPOINT,
    isTablet: width >= SPLIT_BREAKPOINT && width < DESKTOP_BREAKPOINT,
    isDesktop: width >= DESKTOP_BREAKPOINT && width < DESKTOP_XL_BREAKPOINT,
    isDesktopXl: width >= DESKTOP_XL_BREAKPOINT,
    isWide: width >= SPLIT_BREAKPOINT,
    width,
  };
}
