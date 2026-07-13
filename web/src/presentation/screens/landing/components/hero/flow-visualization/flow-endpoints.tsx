import { Check, FileText } from 'lucide-react';

const docIcons = [
  { x: 586, y: 293, size: 13, opacity: 0.58, rotate: -7, delay: '0s' },
  { x: 734, y: 292, size: 12, opacity: 0.50, rotate: 5, delay: '1.8s' },
  { x: 824, y: 305, size: 14, opacity: 0.62, rotate: -3, delay: '3.2s' },
  { x: 968, y: 300, size: 13, opacity: 0.52, rotate: 8, delay: '2.4s' },
  { x: 1018, y: 318, size: 12, opacity: 0.46, rotate: -10, delay: '4.8s' },
  { x: 524, y: 350, size: 14, opacity: 0.66, rotate: -5, delay: '0.8s' },
  { x: 675, y: 357, size: 13, opacity: 0.55, rotate: 7, delay: '1.2s' },
  { x: 782, y: 337, size: 12, opacity: 0.44, rotate: -11, delay: '2.2s' },
  { x: 856, y: 356, size: 15, opacity: 0.64, rotate: 4, delay: '3.6s' },
  { x: 918, y: 343, size: 12, opacity: 0.48, rotate: -6, delay: '4.2s' },
  { x: 552, y: 393, size: 13, opacity: 0.57, rotate: 6, delay: '2s' },
  { x: 684, y: 392, size: 12, opacity: 0.46, rotate: -8, delay: '2.8s' },
  { x: 752, y: 407, size: 14, opacity: 0.60, rotate: 3, delay: '3.4s' },
  { x: 862, y: 397, size: 13, opacity: 0.54, rotate: -4, delay: '4.4s' },
  { x: 992, y: 389, size: 15, opacity: 0.62, rotate: 9, delay: '5.2s' },
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
  const upperNodeY = toContainerY(304);
  const mainNodeY = toContainerY(350);
  const lowerNodeY = toContainerY(396);

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
            opacity: icon.opacity,
            filter: 'drop-shadow(0 0 6px rgba(0, 0, 0, 0.9))',
            animation: `v3-doc-float ${8 + (index % 3) * 2}s ease-in-out ${icon.delay} infinite`,
          }}
        >
          <span
            className="block"
            style={{ transform: `rotate(${icon.rotate}deg)` }}
          >
            <FileText size={icon.size} strokeWidth={1.45} />
          </span>
        </div>
      ))}

      {/* TODO endpoint */}
      <div
        className="absolute flex flex-col items-center"
        style={{
          left: `${todoX}px`,
          top: `${todoY}px`,
          transform: 'translateX(-50%)',
        }}
      >
        <div
          className="relative flex items-center justify-center"
          style={{ transform: 'translateY(-50%)' }}
        >
          {/* Dashed outer ring */}
          <div
            className="absolute h-[62px] w-[62px] rounded-full border border-dashed border-[var(--v3-text-secondary)]/42"
            style={{
              boxShadow:
                '0 0 20px rgba(245, 245, 242, 0.10), inset 0 0 16px rgba(128, 228, 140, 0.06)',
            }}
          />

          {/* Green square icon */}
          <div
            className="relative h-[18px] w-[18px] rounded-[5px] bg-[var(--v3-primary)]"
            style={{
              boxShadow: '0 0 16px rgba(128, 228, 140, 0.60)',
            }}
          />
        </div>
        <span
          className="absolute top-[45px] font-mono text-[16px] uppercase tracking-[0.08em] text-[var(--v3-text-strong)]"
          style={{ textShadow: '0 0 10px rgba(0, 0, 0, 0.9)' }}
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
          boxShadow: '0 0 14px rgba(245, 245, 242, 0.55)',
        }}
      />

      {/* Upper active node */}
      <div
        className="v3-node-pulse absolute h-[15px] w-[15px] rounded-full bg-[var(--v3-primary)]"
        style={{
          left: `${centerX}px`,
          top: `${upperNodeY}px`,
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 0 14px rgba(128, 228, 140, 0.55)',
        }}
      />

      {/* Lower active node */}
      <div
        className="v3-node-pulse absolute h-[15px] w-[15px] rounded-full bg-[var(--v3-primary)]"
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
          transform: 'translateX(-50%)',
        }}
      >
        <div
          className="relative flex items-center justify-center"
          style={{ transform: 'translateY(-50%)' }}
        >
          {/* Soft white glow behind the ring */}
          <div
            className="v3-commit-bloom absolute h-[106px] w-[106px] rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(245, 245, 242, 0.30) 0%, rgba(245, 245, 242, 0.10) 38%, transparent 72%)',
            }}
          />

          {/* Outer ring */}
          <div
            className="absolute h-[62px] w-[62px] rounded-full border border-[var(--v3-text-strong)]/80"
            style={{ boxShadow: '0 0 22px rgba(245, 245, 242, 0.36)' }}
          />

          {/* Inner ring */}
          <div
            className="absolute h-[48px] w-[48px] rounded-full border border-[var(--v3-text-strong)]/32"
          />

          {/* Dark circle with white checkmark */}
          <div
            className="relative flex h-[36px] w-[36px] items-center justify-center rounded-full bg-[var(--v3-bg)]"
            style={{
              boxShadow: 'inset 0 0 0 1px rgba(245, 245, 242, 0.12)',
            }}
          >
            <Check
              size={21}
              strokeWidth={2.5}
              className="text-[var(--v3-text-strong)]"
              aria-hidden="true"
            />
          </div>
        </div>
        <span
          className="absolute top-[45px] font-mono text-[16px] uppercase tracking-[0.08em] text-[var(--v3-text-strong)]"
          style={{ textShadow: '0 0 10px rgba(0, 0, 0, 0.9)' }}
        >
          COMMIT
        </span>
      </div>
    </div>
  );
}
