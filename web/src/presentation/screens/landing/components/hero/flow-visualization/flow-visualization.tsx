import { useEffect, useMemo, useRef, useState } from 'react';

import { useBreakpoint } from '@/core/hooks/use-breakpoint';
import { samplePath, type SampledPath } from '../../../utils/sample-path';
import { BranchPaths } from './branch-paths';
import { FlowEndpoints } from './flow-endpoints';
import { ParticleCanvas } from './particle-canvas';
import { useParticleSystem } from './use-particle-system';

const VIEWBOX_WIDTH = 1576;
const VIEWBOX_VISIBLE_HEIGHT = 220;
const VIEWBOX_OFFSET_Y = 220;

export function FlowVisualization(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [paths, setPaths] = useState<SampledPath[]>([]);
  const [containerSize, setContainerSize] = useState({ width: 1576, height: 220 });

  const { isMobile, isTablet } = useBreakpoint();
  const particleCount = useMemo(() => {
    if (isMobile) return 1400;
    if (isTablet) return 2600;
    return 5000;
  }, [isMobile, isTablet]);

  const commitNebulaCount = useMemo(() => {
    if (isMobile) return 0;
    if (isTablet) return 180;
    return 380;
  }, [isMobile, isTablet]);

  const reducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(([entry]) => {
      setContainerSize({
        width: entry?.contentRect.width ?? 1576,
        height: entry?.contentRect.height ?? 220,
      });
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    const pathElements = svgRef.current.querySelectorAll('path[id^="flow-"]');
    const sampledPaths: SampledPath[] = [];

    pathElements.forEach((pathEl) => {
      if (pathEl.tagName.toLowerCase() === 'path') {
        sampledPaths.push(samplePath(pathEl as SVGPathElement, 2));
      }
    });

    setPaths(sampledPaths);
  }, []);

  const scaleX = containerSize.width / VIEWBOX_WIDTH;
  const scaleY = containerSize.height / VIEWBOX_VISIBLE_HEIGHT;

  useParticleSystem({
    canvasRef,
    containerRef,
    paths,
    particleCount,
    commitNebulaCount,
    reducedMotion,
    scaleX,
    scaleY,
    viewOffsetY: VIEWBOX_OFFSET_Y,
  });

  return (
    <div
      ref={containerRef}
      className="hero-flow relative mx-auto mt-6 h-[180px] w-full max-w-[1576px] overflow-hidden tablet:h-[200px] desktop:h-[220px]"
      aria-hidden="true"
    >
      <BranchPaths
        ref={svgRef}
        className="hero-flow__paths absolute -top-full h-[200%] w-full"
      />

      <ParticleCanvas ref={canvasRef} />

      <FlowEndpoints
        scaleX={scaleX}
        scaleY={scaleY}
        viewOffsetY={VIEWBOX_OFFSET_Y}
      />

      {/* Bottom fade to blend into workbench panel */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[var(--v3-bg)] to-transparent"
        aria-hidden="true"
      />
    </div>
  );
}
