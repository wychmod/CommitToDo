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
            <stop offset="0%" stopColor="rgba(245, 245, 242, 0.16)" />
            <stop offset="45%" stopColor="rgba(245, 245, 242, 0.42)" />
            <stop offset="100%" stopColor="rgba(245, 245, 242, 0.16)" />
          </linearGradient>
          <linearGradient id="branchGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(128, 228, 140, 0.10)" />
            <stop offset="45%" stopColor="rgba(128, 228, 140, 0.32)" />
            <stop offset="100%" stopColor="rgba(128, 228, 140, 0.10)" />
          </linearGradient>
        </defs>

        <g className="hero-flow__paths">
          {/* Upper branch */}
          <path
            id="flow-upper"
            d="M348 350 C520 350 565 285 650 285 C825 285 1010 278 1223 350"
            stroke="url(#branchGradient)"
            strokeWidth="1.2"
          />

          {/* Lower branch */}
          <path
            id="flow-lower"
            d="M348 350 C520 350 565 415 650 415 C825 415 1010 422 1223 350"
            stroke="url(#branchGradient)"
            strokeWidth="1.2"
          />

          {/* Main branch */}
          <path
            id="flow-main"
            d="M348 350 C520 350 600 352 790 352 C960 352 1080 350 1223 350"
            stroke="url(#pathGradient)"
            strokeWidth="1.6"
          />

          {/* Green glow overlay for upper branch */}
          <path
            d="M348 350 C520 350 565 285 650 285 C825 285 1010 278 1223 350"
            stroke="rgba(128, 228, 140, 0.28)"
            strokeWidth="1"
            fill="none"
            style={{ filter: 'drop-shadow(0 0 8px rgba(128, 228, 140, 0.30))' }}
          />

          {/* Green glow overlay for lower branch */}
          <path
            d="M348 350 C520 350 565 415 650 415 C825 415 1010 422 1223 350"
            stroke="rgba(128, 228, 140, 0.28)"
            strokeWidth="1"
            fill="none"
            style={{ filter: 'drop-shadow(0 0 8px rgba(128, 228, 140, 0.30))' }}
          />

          {/* Active green overlay on main path */}
          <path
            d="M348 350 C520 350 600 352 790 352 C960 352 1080 350 1223 350"
            stroke="rgba(128, 228, 140, 0.42)"
            strokeWidth="1.4"
            fill="none"
            style={{ filter: 'drop-shadow(0 0 10px rgba(128, 228, 140, 0.35))' }}
          />
        </g>
      </svg>
    );
  }
);

BranchPaths.displayName = 'BranchPaths';
