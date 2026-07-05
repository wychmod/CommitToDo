import { MOBILE_BREAKPOINT } from '../theme/dimensions';
import { useBreakpoint } from './use-breakpoint';

export function useIsMobile(): boolean {
  const { isMobile } = useBreakpoint();
  return isMobile;
}

export function getIsMobile(width: number): boolean {
  return width < MOBILE_BREAKPOINT;
}
