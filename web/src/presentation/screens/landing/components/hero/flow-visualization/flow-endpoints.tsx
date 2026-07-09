import { Check, FileText } from 'lucide-react';

const docIcons = [
  { x: 600, y: 297, delay: '0s' },
  { x: 980, y: 297, delay: '2.4s' },
  { x: 600, y: 350, delay: '1.2s' },
  { x: 980, y: 350, delay: '3.6s' },
  { x: 600, y: 403, delay: '2s' },
  { x: 980, y: 403, delay: '4.4s' },
];

interface FlowEndpointsProps {
  scaleX: number;
  scaleY: number;
  viewOffsetY: number;
}

export function FlowEndpoints({ scaleX, scaleY, viewOffsetY }: FlowEndpointsProps): JSX.Element {
  const toContainerY = (svgY: number) => (svgY - viewOffsetY) * scaleY;

  const todoX = 348 * scaleX;
  const todoY = toContainerY(350);
  const commitX = 1232 * scaleX;
  const commitY = toContainerY(350);
  const centerX = 790 * scaleX;
  const upperNodeY = toContainerY(290);
  const mainNodeY = toContainerY(350);
  const lowerNodeY = toContainerY(410);

  return (
    <div
      className="hero-flow__nodes pointer-events-none absolute inset-0"
      aria-hidden="true"
    >
      {/* Document icons */}
      {docIcons.map((icon, index) => (
        <div
          key={index}
          className="absolute text-[var(--v3-text-secondary)]"
          style={{
            left: `${icon.x * scaleX}px`,
            top: `${toContainerY(icon.y)}px`,
            opacity: 0.55,
            filter: 'drop-shadow(0 0 4px rgba(0, 0, 0, 0.8))',
            animation: `v3-doc-float ${8 + (index % 3) * 2}s ease-in-out ${icon.delay} infinite`,
          }}
        >
          <FileText size={12} strokeWidth={1.5} />
        </div>
      ))}

      {/* TODO endpoint */}
      <div
        className="absolute flex flex-col items-center"
        style={{
          left: `${todoX}px`,
          top: `${todoY}px`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="relative flex items-center justify-center">
          {/* Dashed outer ring */}
          <div
            className="absolute h-[58px] w-[58px] rounded-full border border-dashed border-[var(--v3-text-secondary)]/40"
            style={{
              boxShadow: '0 0 18px rgba(245, 245, 242, 0.08)',
            }}
          />

          {/* Green square icon */}
          <div
            className="relative h-[14px] w-[14px] rounded-[4px] bg-[var(--v3-primary)]"
            style={{
              boxShadow: '0 0 10px rgba(128, 228, 140, 0.45)',
            }}
          />
        </div>
        <span
          className="mt-10 font-mono text-[14px] uppercase tracking-[0.18em] text-[var(--v3-text-secondary)]"
          style={{ textShadow: '0 0 10px rgba(0, 0, 0, 0.9)' }}
        >
          TODO
        </span>
      </div>

      {/* Main central node */}
      <div
        className="absolute h-[12px] w-[12px] rounded-full bg-[var(--v3-text-strong)]"
        style={{
          left: `${centerX}px`,
          top: `${mainNodeY}px`,
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 0 14px rgba(245, 245, 242, 0.55)',
        }}
      />

      {/* Upper active node */}
      <div
        className="v3-node-pulse absolute h-[12px] w-[12px] rounded-full bg-[var(--v3-primary)]"
        style={{
          left: `${centerX}px`,
          top: `${upperNodeY}px`,
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 0 14px rgba(128, 228, 140, 0.55)',
        }}
      />

      {/* Lower active node */}
      <div
        className="v3-node-pulse absolute h-[12px] w-[12px] rounded-full bg-[var(--v3-primary)]"
        style={{
          left: `${centerX}px`,
          top: `${lowerNodeY}px`,
          transform: 'translate(-50%, -50%)',
          animationDelay: '1.2s',
          boxShadow: '0 0 14px rgba(128, 228, 140, 0.55)',
        }}
      />

      {/* COMMIT endpoint */}
      <div
        className="absolute flex flex-col items-center"
        style={{
          left: `${commitX}px`,
          top: `${commitY}px`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="relative flex items-center justify-center">
          {/* Soft white glow behind the ring */}
          <div
            className="absolute h-[90px] w-[90px] rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(245, 245, 242, 0.18) 0%, rgba(245, 245, 242, 0.06) 40%, transparent 70%)',
              filter: 'blur(16px)',
            }}
          />

          {/* Outer ring */}
          <div
            className="absolute h-[58px] w-[58px] rounded-full border border-[var(--v3-text-strong)]/55"
          />

          {/* Inner ring */}
          <div
            className="absolute h-[44px] w-[44px] rounded-full border border-[var(--v3-text-strong)]/25"
          />

          {/* Dark circle with white checkmark */}
          <div
            className="relative flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[var(--v3-bg)]"
            style={{
              boxShadow: 'inset 0 0 0 1px rgba(245, 245, 242, 0.12)',
            }}
          >
            <Check
              size={18}
              strokeWidth={2.5}
              className="text-[var(--v3-text-strong)]"
              aria-hidden="true"
            />
          </div>
        </div>
        <span
          className="mt-10 font-mono text-[14px] uppercase tracking-[0.18em] text-[var(--v3-text-secondary)]"
          style={{ textShadow: '0 0 10px rgba(0, 0, 0, 0.9)' }}
        >
          COMMIT
        </span>
      </div>
    </div>
  );
}
