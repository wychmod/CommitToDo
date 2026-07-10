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
            <stop offset="0%" stopColor="rgba(245, 245, 242, 0.10)" />
            <stop offset="50%" stopColor="rgba(245, 245, 242, 0.54)" />
            <stop offset="100%" stopColor="rgba(245, 245, 242, 0.16)" />
          </linearGradient>
          <linearGradient id="branchGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(245, 245, 242, 0.06)" />
            <stop offset="50%" stopColor="rgba(128, 228, 140, 0.20)" />
            <stop offset="100%" stopColor="rgba(245, 245, 242, 0.08)" />
          </linearGradient>
        </defs>

        <g className="hero-flow__paths">
          {/* Upper branch — elegant arc that gathers at endpoints and peaks at center */}
          <path
            id="flow-upper"
            d="M348 350 C430 350 500 336 548 305 C594 276 652 276 720 282 C790 288 858 288 928 282 C1014 276 1074 300 1124 329 C1162 350 1200 354 1232 350"
            stroke="url(#branchGradient)"
            strokeWidth="1"
            fill="none"
          />

          {/* Lower branch — mirror of upper */}
          <path
            id="flow-lower"
            d="M348 350 C430 350 500 364 548 395 C594 424 652 424 720 418 C790 412 858 412 928 418 C1014 424 1074 400 1124 371 C1162 350 1200 346 1232 350"
            stroke="url(#branchGradient)"
            strokeWidth="1"
            fill="none"
          />

          {/* Main branch — horizontal center line through the white node */}
          <path
            id="flow-main"
            d="M348 350 L1232 350"
            stroke="url(#pathGradient)"
            strokeWidth="1.45"
            fill="none"
          />

          {/* Green glow overlay for upper branch */}
          <path
            d="M348 350 C430 350 500 336 548 305 C594 276 652 276 720 282 C790 288 858 288 928 282 C1014 276 1074 300 1124 329 C1162 350 1200 354 1232 350"
            stroke="rgba(128, 228, 140, 0.12)"
            strokeWidth="0.9"
            fill="none"
            style={{ filter: 'drop-shadow(0 0 7px rgba(128, 228, 140, 0.18))' }}
          />

          {/* Green glow overlay for lower branch */}
          <path
            d="M348 350 C430 350 500 364 548 395 C594 424 652 424 720 418 C790 412 858 412 928 418 C1014 424 1074 400 1124 371 C1162 350 1200 346 1232 350"
            stroke="rgba(128, 228, 140, 0.12)"
            strokeWidth="0.9"
            fill="none"
            style={{ filter: 'drop-shadow(0 0 7px rgba(128, 228, 140, 0.18))' }}
          />

          {/* Subtle white glow overlay for main path */}
          <path
            d="M348 350 L1232 350"
            stroke="rgba(245, 245, 242, 0.26)"
            strokeWidth="1.35"
            fill="none"
            style={{ filter: 'drop-shadow(0 0 10px rgba(245, 245, 242, 0.24))' }}
          />
        </g>
      </svg>
    );
  }
);

BranchPaths.displayName = 'BranchPaths';
