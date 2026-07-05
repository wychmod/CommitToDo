import { SPLIT_BREAKPOINT } from '../theme/dimensions';
import { useBreakpoint } from './use-breakpoint';

export function useIsWide(): boolean {
  const { isWide } = useBreakpoint();
  return isWide;
}

export function getIsWide(width: number): boolean {
  return width >= SPLIT_BREAKPOINT;
}
