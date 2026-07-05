import { NAV_BREAKPOINT } from '../theme/dimensions';
import { useBreakpoint } from './use-breakpoint';

export function useIsDesktop(): boolean {
  const { width } = useBreakpoint();
  return width >= NAV_BREAKPOINT;
}

export function getIsDesktop(width: number): boolean {
  return width >= NAV_BREAKPOINT;
}
