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
  glow: number;
}

interface NebulaParticle {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  angle: number;
  distance: number;
  angularSpeed: number;
  driftSpeed: number;
  color: 'white' | 'green';
}

interface UseParticleSystemOptions {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  paths: SampledPath[];
  particleCount: number;
  commitNebulaCount: number;
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
    { range: [0.85, 1.0] as const, weight: 1.8 },
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
    if (r < 0.62) return 0;
    if (r < 0.86) return 1;
    return 2;
  }

  if (progress < 0.85) {
    // Convergence begins
    if (r < 0.78) return 0;
    if (r < 0.94) return 1;
    return 2;
  }

  // Pre-COMMIT: strong convergence to main path, white spray
  if (r < 0.90) return 0;
  if (r < 0.98) return 1;
  return 2;
}

function createParticle(): Particle {
  const progress = sampleWeightedProgress();
  const pathIndex = samplePathIndex(progress);

  // Brighter white spray near COMMIT.
  const whiteBias = progress > 0.85 ? 0.85 : progress > 0.70 ? 0.70 : 0.20;
  const color: 'white' | 'green' = Math.random() < whiteBias ? 'white' : 'green';
  const isHighlight = Math.random() < 0.04;

  let alpha: number;
  if (color === 'green') {
    alpha = isHighlight
      ? 0.70 + Math.random() * 0.25
      : 0.25 + Math.random() * 0.35;
  } else {
    alpha = isHighlight
      ? 0.65 + Math.random() * 0.30
      : 0.22 + Math.random() * 0.32;
  }

  // Brightness gradient from left (dim) to right (bright).
  alpha *= 0.45 + 0.55 * progress;

  // Reduce jitter as particles converge toward COMMIT.
  const convergence = progress > 0.85 ? 0.20 : progress > 0.70 ? 0.35 : 0.75;

  return {
    pathIndex,
    progress,
    speed: 22 + Math.random() * 28,
    radius: isHighlight ? 1.2 + Math.random() * 0.9 : 0.45 + Math.random() * 0.75,
    alpha,
    color,
    jitterX: (Math.random() - 0.5) * 2.5 * convergence,
    jitterY: (Math.random() - 0.5) * 5 * convergence,
    glow: isHighlight ? 0.80 + Math.random() * 0.20 : 0.30 + Math.random() * 0.40,
  };
}

function createNebulaParticle(commitX: number, commitY: number): NebulaParticle {
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.random() * 120 + 4;
  const isGreen = Math.random() < 0.20;

  return {
    x: commitX + Math.cos(angle) * distance,
    y: commitY + Math.sin(angle) * distance,
    radius: 0.25 + Math.random() * 0.95,
    alpha: 0.40 + Math.random() * 0.45,
    angle,
    distance,
    angularSpeed: (Math.random() - 0.5) * 0.0015,
    driftSpeed: -0.4 - Math.random() * 1.0,
    color: isGreen ? 'green' : 'white',
  };
}

function createGlowSprite(size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');

  if (!context) {
    return canvas;
  }

  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.25, 'rgba(255, 255, 255, 0.45)');
  gradient.addColorStop(0.55, 'rgba(255, 255, 255, 0.12)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  return canvas;
}

export function useParticleSystem({
  canvasRef,
  containerRef,
  paths,
  particleCount,
  commitNebulaCount,
  reducedMotion,
  scaleX,
  scaleY,
  viewOffsetY,
}: UseParticleSystemOptions): void {
  const particlesRef = useRef<Particle[]>([]);
  const nebulaRef = useRef<NebulaParticle[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const visibleRef = useRef(true);
  const glowSpriteRef = useRef<HTMLCanvasElement | null>(null);
  const frameTimesRef = useRef<number[]>([]);
  const fallbackRef = useRef(false);

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

    const commitX = 1223 * scaleX;
    const commitY = (350 - viewOffsetY) * scaleY;
    const centerX = 790 * scaleX;

    const resizeCanvas = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Recreate glow sprite for current DPR.
      const spriteSize = Math.max(32, Math.floor(64 * dpr));
      glowSpriteRef.current = createGlowSprite(spriteSize);
    };

    resizeCanvas();

    const observer = new ResizeObserver(resizeCanvas);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    const initParticles = () => {
      const particles: Particle[] = [];
      for (let i = 0; i < particleCount; i += 1) {
        particles.push(createParticle());
      }
      particlesRef.current = particles;

      const nebula: NebulaParticle[] = [];
      for (let i = 0; i < commitNebulaCount; i += 1) {
        nebula.push(createNebulaParticle(commitX, commitY));
      }
      nebulaRef.current = nebula;
    };

    initParticles();

    const getPointOnPath = (path: SampledPath, progress: number): { x: number; y: number } | null => {
      const pointIndex = Math.min(
        path.points.length - 1,
        Math.floor(progress * (path.points.length - 1))
      );
      const point = path.points[pointIndex];
      if (!point) return null;

      return {
        x: point.x * scaleX,
        y: (point.y - viewOffsetY) * scaleY,
      };
    };

    const drawGlow = (x: number, y: number, radius: number, color: 'white' | 'green', alpha: number) => {
      const sprite = glowSpriteRef.current;
      if (!sprite) return;

      const size = radius * 8;
      const tintAlpha = color === 'green' ? alpha * 0.80 : alpha;
      const previousAlpha = ctx.globalAlpha;

      ctx.globalAlpha = tintAlpha * 0.40;
      ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
      ctx.globalAlpha = previousAlpha;
    };

    const drawParticleCore = (x: number, y: number, radius: number, color: 'white' | 'green', alpha: number) => {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);

      if (color === 'green') {
        ctx.fillStyle = `rgba(128, 228, 140, ${alpha})`;
      } else {
        ctx.fillStyle = `rgba(245, 245, 242, ${alpha})`;
      }

      ctx.fill();
    };

    const drawParticle = (p: Particle) => {
      const path = paths[p.pathIndex];
      if (!path) return;

      const point = getPointOnPath(path, p.progress);
      if (!point) return;

      // Reduce noise near convergence area.
      const distanceToCenter = Math.abs(point.x - centerX);
      const convergenceFactor = Math.min(1, distanceToCenter / 180);

      const finalX = point.x + p.jitterX * convergenceFactor;
      const finalY = point.y + p.jitterY * convergenceFactor;

      if (!fallbackRef.current) {
        drawGlow(finalX, finalY, p.radius, p.color, p.alpha * p.glow);
      }
      drawParticleCore(finalX, finalY, p.radius, p.color, p.alpha);
    };

    const drawNebula = () => {
      const nebula = nebulaRef.current;
      if (nebula.length === 0) return;

      ctx.globalCompositeOperation = 'lighter';

      for (const p of nebula) {
        const size = p.radius * 7;
        const sprite = glowSpriteRef.current;
        if (!sprite) continue;

        const previousAlpha = ctx.globalAlpha;
        const baseAlpha = fallbackRef.current ? 0.5 : 0.85;
        ctx.globalAlpha = p.alpha * baseAlpha * (p.color === 'green' ? 0.70 : 1.0);

        ctx.drawImage(sprite, p.x - size / 2, p.y - size / 2, size, size);
        ctx.globalAlpha = previousAlpha;
      }

      ctx.globalCompositeOperation = 'source-over';
    };

    const updateNebula = (delta: number) => {
      const nebula = nebulaRef.current;
      for (const p of nebula) {
        p.angle += p.angularSpeed;
        p.distance += p.driftSpeed * delta * 10;

        if (p.distance < 6) {
          p.distance = 90 + Math.random() * 30;
          p.angle = Math.random() * Math.PI * 2;
        }

        p.x = commitX + Math.cos(p.angle) * p.distance;
        p.y = commitY + Math.sin(p.angle) * p.distance;
      }
    };

    const updatePerformanceFallback = (delta: number) => {
      frameTimesRef.current.push(delta);
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }

      if (frameTimesRef.current.length === 60 && !fallbackRef.current) {
        const averageFrameTime =
          frameTimesRef.current.reduce((sum, t) => sum + t, 0) / frameTimesRef.current.length;
        if (averageFrameTime > 0.022) {
          fallbackRef.current = true;
        }
      }
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

      updatePerformanceFallback(delta);

      // Trail effect.
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Background noise dots.
      if (!fallbackRef.current) {
        ctx.fillStyle = 'rgba(245, 245, 242, 0.035)';
        for (let i = 0; i < 40; i += 1) {
          const nx = Math.random() * rect.width;
          const ny = Math.random() * rect.height;
          ctx.beginPath();
          ctx.arc(nx, ny, Math.random() * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Glow pass for path particles.
      if (!fallbackRef.current) {
        ctx.globalCompositeOperation = 'screen';
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

      ctx.globalCompositeOperation = 'source-over';

      // Nebula around COMMIT.
      updateNebula(delta);
      drawNebula();

      rafRef.current = requestAnimationFrame(render);
    };

    const visibilityHandler = () => {
      visibleRef.current = document.visibilityState === 'visible';
      if (visibleRef.current) {
        lastTimeRef.current = null;
        frameTimesRef.current = [];
      }
    };

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry?.isIntersecting ?? true;
        if (visibleRef.current) {
          lastTimeRef.current = null;
          frameTimesRef.current = [];
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
  }, [
    canvasRef,
    containerRef,
    paths,
    particleCount,
    commitNebulaCount,
    reducedMotion,
    scaleX,
    scaleY,
    viewOffsetY,
  ]);
}
