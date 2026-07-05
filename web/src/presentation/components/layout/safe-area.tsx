import * as React from 'react';

export interface SafeAreaProps {
  children: React.ReactNode;
  top?: boolean;
  bottom?: boolean;
}

export function SafeArea({
  children,
  top = true,
  bottom = true,
}: SafeAreaProps): JSX.Element {
  return (
    <div
      className="h-full w-full"
      style={{
        paddingTop: top ? 'var(--safe-area-top)' : undefined,
        paddingBottom: bottom ? 'var(--safe-area-bottom)' : undefined,
      }}
    >
      {children}
    </div>
  );
}
