import { forwardRef } from 'react';

export interface BranchPathsHandle {
  getPaths: () => SVGPathElement[];
}

export const BranchPaths = forwardRef<SVGSVGElement, { className?: string }>(
  ({ className }, ref): JSX.Element => {
    return (
      <svg
        ref={ref}
        className={className}
        viewBox="0 0 1576 440"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(245, 245, 242, 0.12)" />
            <stop offset="50%" stopColor="rgba(245, 245, 242, 0.32)" />
            <stop offset="100%" stopColor="rgba(245, 245, 242, 0.12)" />
          </linearGradient>
        </defs>

        <g className="hero-flow__paths">
          <path
            id="flow-main"
            d="M348 350 C520 350 600 350 790 352 C960 352 1080 350 1223 350"
            stroke="url(#pathGradient)"
            strokeWidth="1.2"
          />
          <path
            id="flow-upper"
            d="M348 350 C520 350 565 300 650 300 C825 300 1010 292 1223 350"
            stroke="rgba(245, 245, 242, 0.16)"
            strokeWidth="1"
          />
          <path
            id="flow-lower"
            d="M348 350 C520 350 570 405 650 405 C825 405 1010 410 1223 350"
            stroke="rgba(245, 245, 242, 0.16)"
            strokeWidth="1"
          />

          {/* Active green overlay on main path */}
          <path
            d="M348 350 C520 350 600 350 790 352 C960 352 1080 350 1223 350"
            stroke="rgba(128, 228, 140, 0.35)"
            strokeWidth="1.2"
            fill="none"
            style={{ filter: 'drop-shadow(0 0 6px rgba(128, 228, 140, 0.25))' }}
          />
        </g>
      </svg>
    );
  }
);

BranchPaths.displayName = 'BranchPaths';
