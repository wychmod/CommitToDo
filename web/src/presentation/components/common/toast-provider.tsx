import * as ToastPrimitive from '@radix-ui/react-toast';
import * as React from 'react';

export interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps): JSX.Element {
  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {children}
      <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[100] flex w-full max-w-sm flex-col gap-xs p-md outline-none" />
    </ToastPrimitive.Provider>
  );
}
