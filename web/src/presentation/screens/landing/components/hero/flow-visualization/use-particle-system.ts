import { useEffect, useRef } from 'react';

import type { SampledPath } from '../../../utils/sample-path';

interface Particle {
  pathIndex: number;
  progress: number;
  speed: number;
  radius: number;
  alpha: number;
  color: 'white' | 'green';
  jitterX: number;
  jitterY: number;
}

interface UseParticleSystemOptions {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  paths: SampledPath[];
  particleCount: number;
  reducedMotion: boolean;
  scaleX: number;
  scaleY: number;
  viewOffsetY: number;
}

/**
 * Sample an initial progress value weighted by the desired density regions:
 * - medium density right after TODO (0..0.15)
 * - highest density in the central branch area (~0.35..0.70)
 * - elevated density converging before COMMIT (~0.85..1.0)
 */
function sampleWeightedProgress(): number {
  const buckets = [
    { range: [0, 0.15] as const, weight: 1.2 },
    { range: [0.15, 0.32] as const, weight: 0.7 },
    { range: [0.32, 0.45] as const, weight: 1.4 },
    { range: [0.45, 0.70] as const, weight: 2.2 },
    { range: [0.70, 0.85] as const, weight: 0.9 },
    { range: [0.85, 1.0] as const, weight: 1.6 },
  ];

  const totalWeight = buckets.reduce((sum, b) => sum + b.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const bucket of buckets) {
    roll -= bucket.weight;
    if (roll <= 0) {
      const [min, max] = bucket.range;
      return min + Math.random() * (max - min);
    }
  }

  return Math.random();
}

/**
 * Pick a path index for the given progress so that:
 * - early flow keeps all three branches visible (medium density)
 * - central area favours the main path but keeps branches alive
 * - pre-COMMIT area strongly converges onto the main path
 */
function samplePathIndex(progress: number): number {
  const r = Math.random();

  if (progress < 0.15) {
    // TODO start: all branches visible, slight main bias
    if (r < 0.42) return 0;
    if (r < 0.72) return 1;
    return 2;
  }

  if (progress < 0.35) {
    if (r < 0.50) return 0;
    if (r < 0.78) return 1;
    return 2;
  }

  if (progress < 0.70) {
    // Central branch area: main path dominant
    if (r < 0.58) return 0;
    if (r < 0.82) return 1;
    return 2;
  }

  if (progress < 0.85) {
    // Convergence begins
    if (r < 0.75) return 0;
    if (r < 0.92) return 1;
    return 2;
  }

  // Pre-COMMIT: strong convergence to main path, white spray
  if (r < 0.88) return 0;
  if (r < 0.97) return 1;
  return 2;
}

function createParticle(): Particle {
  const progress = sampleWeightedProgress();
  const pathIndex = samplePathIndex(progress);
  const color: 'white' | 'green' = Math.random() < 0.20 ? 'green' : 'white';
  const isHighlight = Math.random() < 0.02;

  let alpha: number;
  if (color === 'green') {
    alpha = isHighlight
      ? 0.55 + Math.random() * 0.35
      : 0.15 + Math.random() * 0.45;
  } else {
    alpha = isHighlight
      ? 0.45 + Math.random() * 0.37
      : 0.08 + Math.random() * 0.40;
  }

  // Reduce jitter as particles converge toward COMMIT.
  const convergence = progress > 0.85 ? 0.4 : progress > 0.70 ? 0.7 : 1.0;

  return {
    pathIndex,
    progress,
    speed: 18 + Math.random() * 24,
    radius: isHighlight ? 1.2 + Math.random() * 1.0 : 0.35 + Math.random() * 0.8,
    alpha,
    color,
    jitterX: (Math.random() - 0.5) * 4 * convergence,
    jitterY: (Math.random() - 0.5) * 8 * convergence,
  };
}

export function useParticleSystem({
  canvasRef,
  containerRef,
  paths,
  particleCount,
  reducedMotion,
  scaleX,
  scaleY,
  viewOffsetY,
}: UseParticleSystemOptions): void {
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const visibleRef = useRef(true);

  useEffect(() => {
    if (reducedMotion || paths.length === 0 || !canvasRef.current || !containerRef.current) {
      return undefined;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (prefersReducedMotion.matches) {
      return undefined;
    }

    const resizeCanvas = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resizeCanvas();

    const observer = new ResizeObserver(resizeCanvas);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    const centerX = 790 * scaleX;

    const initParticles = () => {
      const particles: Particle[] = [];
      for (let i = 0; i < particleCount; i += 1) {
        particles.push(createParticle());
      }
      particlesRef.current = particles;
    };

    initParticles();

    const drawParticle = (p: Particle) => {
      const path = paths[p.pathIndex];
      if (!path) return;

      const pointIndex = Math.min(
        path.points.length - 1,
        Math.floor(p.progress * (path.points.length - 1))
      );
      const point = path.points[pointIndex];
      if (!point) return;

      const x = point.x * scaleX;
      const y = (point.y - viewOffsetY) * scaleY;

      // Reduce noise near convergence area.
      const distanceToCenter = Math.abs(x - centerX);
      const convergenceFactor = Math.min(1, distanceToCenter / 180);

      const finalX = x + p.jitterX * convergenceFactor;
      const finalY = y + p.jitterY * convergenceFactor;

      ctx.beginPath();
      ctx.arc(finalX, finalY, p.radius, 0, Math.PI * 2);

      if (p.color === 'green') {
        ctx.fillStyle = `rgba(128, 228, 140, ${p.alpha})`;
      } else {
        ctx.fillStyle = `rgba(245, 245, 242, ${p.alpha})`;
      }

      ctx.fill();
    };

    const render = (timestamp: number) => {
      if (!visibleRef.current) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }
      const delta = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      // Trail effect.
      ctx.fillStyle = 'rgba(0, 0, 0, 0.10)';
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Background noise dots.
      ctx.fillStyle = 'rgba(245, 245, 242, 0.03)';
      for (let i = 0; i < 60; i += 1) {
        const nx = Math.random() * rect.width;
        const ny = Math.random() * rect.height;
        ctx.beginPath();
        ctx.arc(nx, ny, Math.random() * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }

      const particles = particlesRef.current;
      for (const p of particles) {
        const path = paths[p.pathIndex];
        if (!path) continue;

        p.progress += (p.speed * delta) / path.totalLength;

        if (p.progress >= 1) {
          p.progress = 0;
          p.speed = 18 + Math.random() * 24;
        }

        drawParticle(p);
      }

      rafRef.current = requestAnimationFrame(render);
    };

    const visibilityHandler = () => {
      visibleRef.current = document.visibilityState === 'visible';
      if (visibleRef.current) {
        lastTimeRef.current = null;
      }
    };

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry?.isIntersecting ?? true;
        if (visibleRef.current) {
          lastTimeRef.current = null;
        }
      },
      { threshold: 0 }
    );

    intersectionObserver.observe(canvas);
    document.addEventListener('visibilitychange', visibilityHandler);

    rafRef.current = requestAnimationFrame(render);

    return () => {
      observer.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', visibilityHandler);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [canvasRef, containerRef, paths, particleCount, reducedMotion, scaleX, scaleY, viewOffsetY]);
}
