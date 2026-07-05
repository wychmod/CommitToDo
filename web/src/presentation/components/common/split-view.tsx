import * as React from 'react';
import { useIsWide } from '../../../core/hooks/use-is-wide';

export interface SplitViewProps {
  master: React.ReactNode;
  detail: React.ReactNode;
  detailVisible?: boolean;
  emptyDetail?: React.ReactNode;
  masterFlex?: number;
  detailFlex?: number;
}

export function SplitView({
  master,
  detail,
  detailVisible = true,
  emptyDetail,
  masterFlex = 2,
  detailFlex = 3,
}: SplitViewProps): JSX.Element {
  const isWide = useIsWide();

  if (!isWide) {
    return <>{master}</>;
  }

  return (
    <div className="flex h-full w-full">
      <div
        className="min-w-0 overflow-auto"
        style={{ flex: masterFlex }}
      >
        {master}
      </div>
      <div className="w-px shrink-0 bg-hairline" />
      <div
        className="min-w-0 overflow-auto"
        style={{ flex: detailFlex }}
      >
        {detailVisible ? detail : (emptyDetail ?? null)}
      </div>
    </div>
  );
}
