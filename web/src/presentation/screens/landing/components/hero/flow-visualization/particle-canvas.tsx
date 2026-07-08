import { forwardRef } from 'react';

export const ParticleCanvas = forwardRef<HTMLCanvasElement, { className?: string }>(
  ({ className }, ref): JSX.Element => {
    return (
      <canvas
        ref={ref}
        className={`hero-flow__particles absolute inset-0 ${className ?? ''}`}
        aria-hidden="true"
      />
    );
  }
);

ParticleCanvas.displayName = 'ParticleCanvas';
