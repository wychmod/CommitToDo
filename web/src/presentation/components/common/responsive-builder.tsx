import * as React from 'react';
import { useBreakpoint } from '../../../core/hooks/use-breakpoint';

export interface ResponsiveBuilderProps {
  mobile: React.ReactNode;
  tablet?: React.ReactNode;
  desktop?: React.ReactNode;
  desktopXl?: React.ReactNode;
}

export function ResponsiveBuilder({
  mobile,
  tablet,
  desktop,
  desktopXl,
}: ResponsiveBuilderProps): JSX.Element {
  const { isMobile, isMobileLg, isTablet, isDesktop, isDesktopXl } = useBreakpoint();

  if (isDesktopXl && desktopXl !== undefined) return <>{desktopXl}</>;
  if (isDesktop && desktop !== undefined) return <>{desktop}</>;
  if (isTablet && tablet !== undefined) return <>{tablet}</>;
  if ((isMobileLg || isTablet) && tablet !== undefined) return <>{tablet}</>;
  if ((isMobile || isMobileLg) && mobile !== undefined) return <>{mobile}</>;
  if (desktop !== undefined) return <>{desktop}</>;
  return <>{mobile}</>;
}
