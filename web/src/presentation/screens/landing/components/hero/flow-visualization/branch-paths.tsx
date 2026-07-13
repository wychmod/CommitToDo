import { forwardRef } from 'react';

const upperBranchPath =
  'M348 350 L486 350 C534 350 560 316 624 304 ' +
  'C710 288 850 294 944 304 C1008 312 1044 350 1090 350 L1232 350';
const lowerBranchPath =
  'M348 350 L486 350 C534 350 560 384 624 396 ' +
  'C710 412 850 406 944 396 C1008 388 1044 350 1090 350 L1232 350';
const mainBranchPath = 'M348 350 L1232 350';

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
          {/* The branches travel together before separating into a compact fan. */}
          <path
            id="flow-upper"
            d={upperBranchPath}
            stroke="url(#branchGradient)"
            strokeWidth="1"
            fill="none"
          />

          {/* Lower branch mirrors the upper branch around the horizontal axis. */}
          <path
            id="flow-lower"
            d={lowerBranchPath}
            stroke="url(#branchGradient)"
            strokeWidth="1"
            fill="none"
          />

          {/* Main branch stays exactly horizontal through the white node. */}
          <path
            id="flow-main"
            d={mainBranchPath}
            stroke="url(#pathGradient)"
            strokeWidth="1.45"
            fill="none"
          />

          {/* Green glow overlay for upper branch */}
          <path
            d={upperBranchPath}
            stroke="rgba(128, 228, 140, 0.12)"
            strokeWidth="0.9"
            fill="none"
            style={{ filter: 'drop-shadow(0 0 7px rgba(128, 228, 140, 0.18))' }}
          />

          {/* Green glow overlay for lower branch */}
          <path
            d={lowerBranchPath}
            stroke="rgba(128, 228, 140, 0.12)"
            strokeWidth="0.9"
            fill="none"
            style={{ filter: 'drop-shadow(0 0 7px rgba(128, 228, 140, 0.18))' }}
          />

          {/* Subtle white glow overlay for main path */}
          <path
            d={mainBranchPath}
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
