import { Check, FileText } from 'lucide-react';

const docIcons = [
  { x: 620, y: 300, delay: '0s' },
  { x: 720, y: 352, delay: '1.2s' },
  { x: 840, y: 410, delay: '2.4s' },
  { x: 950, y: 300, delay: '3.6s' },
  { x: 1050, y: 350, delay: '4.8s' },
  { x: 580, y: 395, delay: '1.8s' },
  { x: 880, y: 275, delay: '3s' },
  { x: 1150, y: 358, delay: '4.2s' },
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
  const commitX = 1223 * scaleX;
  const commitY = toContainerY(350);
  const centerX = 790 * scaleX;
  const upperNodeY = toContainerY(301);
  const mainNodeY = toContainerY(352);
  const lowerNodeY = toContainerY(406);

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
            opacity: 0.90,
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
          {/* Outer thin ring */}
          <div
            className="absolute h-[50px] w-[50px] rounded-[8px] border border-[var(--v3-primary)]/70"
            style={{
              boxShadow: '0 0 20px rgba(128, 228, 140, 0.22), inset 0 0 8px rgba(128, 228, 140, 0.08)',
            }}
          />
          {/* Green rounded square with checkmark */}
          <div className="relative flex h-[24px] w-[24px] items-center justify-center rounded-[5px] bg-[var(--v3-primary)]"
          >
            <Check
              size={14}
              strokeWidth={2.5}
              className="text-[var(--v3-text-on-primary)]"
              aria-hidden="true"
            />
          </div>
        </div>
        <span
          className="mt-11 font-mono text-[16px] text-[var(--v3-text-secondary)]"
          style={{ textShadow: '0 0 12px rgba(0, 0, 0, 0.9), 0 1px 2px rgba(0, 0, 0, 0.8)' }}
        >
          TODO
        </span>
      </div>

      {/* Main central node */}
      <div
        className="absolute h-[14px] w-[14px] rounded-full bg-[var(--v3-text-strong)]"
        style={{
          left: `${centerX}px`,
          top: `${mainNodeY}px`,
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Upper active node */}
      <div
        className="v3-node-pulse absolute h-[14px] w-[14px] rounded-full bg-[var(--v3-primary)]"
        style={{
          left: `${centerX}px`,
          top: `${upperNodeY}px`,
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Lower active node */}
      <div
        className="v3-node-pulse absolute h-[14px] w-[14px] rounded-full bg-[var(--v3-primary)]"
        style={{
          left: `${centerX}px`,
          top: `${lowerNodeY}px`,
          transform: 'translate(-50%, -50%)',
          animationDelay: '1.2s',
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
          {/* Layered nebula glow */}
          <div className="v3-commit-nebula-outer h-[140px] w-[140px]" />
          <div className="v3-commit-nebula-mid h-[90px] w-[90px]" />
          <div className="v3-commit-nebula-core h-[50px] w-[50px]" />

          {/* Outer ring */}
          <div
            className="absolute h-[58px] w-[58px] rounded-full border border-[var(--v3-primary)]/45"
          />

          {/* Green circle with white checkmark */}
          <div className="relative flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[var(--v3-primary)]"
          >
            <Check
              size={18}
              strokeWidth={2.5}
              className="text-[var(--v3-text-on-primary)]"
              aria-hidden="true"
            />
          </div>
        </div>
        <span
          className="mt-11 font-mono text-[16px] text-[var(--v3-text-secondary)]"
          style={{ textShadow: '0 0 12px rgba(0, 0, 0, 0.9), 0 1px 2px rgba(0, 0, 0, 0.8)' }}
        >
          COMMIT
        </span>
      </div>
    </div>
  );
}
