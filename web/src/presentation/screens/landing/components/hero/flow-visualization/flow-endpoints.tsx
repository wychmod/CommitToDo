import { Check, FileText } from 'lucide-react';

const docIcons = [
  { x: 620, y: 315, delay: '0s' },
  { x: 720, y: 285, delay: '1.2s' },
  { x: 840, y: 380, delay: '2.4s' },
  { x: 950, y: 300, delay: '3.6s' },
  { x: 1050, y: 395, delay: '4.8s' },
  { x: 580, y: 395, delay: '1.8s' },
  { x: 880, y: 270, delay: '3s' },
  { x: 1000, y: 345, delay: '4.2s' },
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
            opacity: 0.45,
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
          <div
            className="absolute h-[56px] w-[56px] rounded-[5px] border border-[var(--v3-primary)]/30"
            style={{
              boxShadow: '0 0 18px rgba(128, 228, 140, 0.18), inset 0 0 12px rgba(128, 228, 140, 0.12)',
            }}
          />
          <div
            className="absolute h-[44px] w-[44px] rounded-[5px] border border-[var(--v3-primary)]/50"
          />
          <div className="relative flex h-[22px] w-[22px] items-center justify-center rounded-[5px] bg-[var(--v3-primary)]"
          >
            <span className="font-mono text-[10px] font-bold text-[var(--v3-text-on-primary)]"
            >T</span>
          </div>
        </div>
        <span className="mt-11 font-mono text-[16px] text-[var(--v3-text-secondary)]"
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
          <div
            className="v3-commit-bloom absolute h-[100px] w-[100px] rounded-full bg-white/10"
            style={{
              filter: 'blur(40px)',
            }}
          />
          <div
            className="absolute h-[55px] w-[55px] rounded-full border border-white/30"
          />
          <div className="relative flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[var(--v3-bg)]"
          >
            <Check
              size={18}
              strokeWidth={2.5}
              className="text-[var(--v3-text-strong)]"
            />
          </div>
        </div>
        <span className="mt-11 font-mono text-[16px] text-[var(--v3-text-secondary)]"
        >
          COMMIT
        </span>
      </div>
    </div>
  );
}
