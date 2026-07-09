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
            <stop offset="0%" stopColor="rgba(245, 245, 242, 0.14)" />
            <stop offset="50%" stopColor="rgba(245, 245, 242, 0.42)" />
            <stop offset="100%" stopColor="rgba(245, 245, 242, 0.14)" />
          </linearGradient>
          <linearGradient id="branchGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(128, 228, 140, 0.08)" />
            <stop offset="50%" stopColor="rgba(128, 228, 140, 0.32)" />
            <stop offset="100%" stopColor="rgba(128, 228, 140, 0.08)" />
          </linearGradient>
        </defs>

        <g className="hero-flow__paths">
          {/* Upper branch — elegant arc that gathers at endpoints and peaks at center */}
          <path
            id="flow-upper"
            d="M348 350 C470 270, 1110 270, 1232 350"
            stroke="url(#branchGradient)"
            strokeWidth="1.2"
            fill="none"
          />

          {/* Lower branch — mirror of upper */}
          <path
            id="flow-lower"
            d="M348 350 C470 430, 1110 430, 1232 350"
            stroke="url(#branchGradient)"
            strokeWidth="1.2"
            fill="none"
          />

          {/* Main branch — horizontal center line through the white node */}
          <path
            id="flow-main"
            d="M348 350 L1232 350"
            stroke="url(#pathGradient)"
            strokeWidth="1.6"
            fill="none"
          />

          {/* Green glow overlay for upper branch */}
          <path
            d="M348 350 C470 270, 1110 270, 1232 350"
            stroke="rgba(128, 228, 140, 0.26)"
            strokeWidth="1"
            fill="none"
            style={{ filter: 'drop-shadow(0 0 8px rgba(128, 228, 140, 0.28))' }}
          />

          {/* Green glow overlay for lower branch */}
          <path
            d="M348 350 C470 430, 1110 430, 1232 350"
            stroke="rgba(128, 228, 140, 0.26)"
            strokeWidth="1"
            fill="none"
            style={{ filter: 'drop-shadow(0 0 8px rgba(128, 228, 140, 0.28))' }}
          />

          {/* Subtle white glow overlay for main path */}
          <path
            d="M348 350 L1232 350"
            stroke="rgba(245, 245, 242, 0.18)"
            strokeWidth="1.4"
            fill="none"
            style={{ filter: 'drop-shadow(0 0 10px rgba(245, 245, 242, 0.22))' }}
          />
        </g>
      </svg>
    );
  }
);

BranchPaths.displayName = 'BranchPaths';
