import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

import type { SampledPath } from '../../../utils/sample-path';

const TODO_X = 348;
const TODO_Y = 350;
const COMMIT_X = 1232;
const COMMIT_Y = 350;

type ParticleColor = 'white' | 'green';

interface PathDust {
  kind: 'path';
  pathIndex: number;
  progress: number;
  offsetX: number;
  offsetY: number;
  radius: number;
  alpha: number;
  color: ParticleColor;
  phase: number;
}

interface CloudDust {
  kind: 'cloud';
  x: number;
  y: number;
  progress: number;
  radius: number;
  alpha: number;
  color: ParticleColor;
  phase: number;
}

type DustParticle = PathDust | CloudDust;

interface SparkParticle {
  pathIndex: number;
  progress: number;
  speed: number;
  offsetY: number;
  radius: number;
  alpha: number;
  color: ParticleColor;
  phase: number;
}

interface UseParticleSystemOptions {
  canvasRef: RefObject<HTMLCanvasElement>;
  containerRef: RefObject<HTMLDivElement>;
  paths: SampledPath[];
  particleCount: number;
  commitNebulaCount: number;
  reducedMotion: boolean;
  scaleX: number;
  scaleY: number;
  viewOffsetY: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomNormal(): number {
  let u = 0;
  let v = 0;

  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();

  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function sampleWeightedProgress(): number {
  const buckets = [
    { range: [0, 0.12] as const, weight: 1.45 },
    { range: [0.12, 0.30] as const, weight: 0.90 },
    { range: [0.30, 0.58] as const, weight: 1.28 },
    { range: [0.58, 0.80] as const, weight: 1.08 },
    { range: [0.80, 1] as const, weight: 1.90 },
  ];
  const totalWeight = buckets.reduce((sum, bucket) => sum + bucket.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const bucket of buckets) {
    roll -= bucket.weight;
    if (roll <= 0) {
      const [min, max] = bucket.range;
      return randomBetween(min, max);
    }
  }

  return Math.random();
}

function choosePathIndex(progress: number): number {
  const r = Math.random();

  if (progress < 0.16) {
    if (r < 0.64) return 0;
    if (r < 0.82) return 1;
    return 2;
  }

  if (progress > 0.82) {
    if (r < 0.76) return 0;
    if (r < 0.88) return 1;
    return 2;
  }

  if (r < 0.64) return 0;
  if (r < 0.82) return 1;
  return 2;
}

function createPathDust(): PathDust {
  const progress = sampleWeightedProgress();
  const pathIndex = choosePathIndex(progress);
  const endpointBloom =
    progress > 0.84 ? (progress - 0.84) / 0.16 : 0;
  const isMergedStart = progress < 0.16;
  const branchSpread = isMergedStart ? 1.6 : pathIndex === 0 ? 1.8 : 4.2;
  const spread = branchSpread + endpointBloom * randomBetween(16, 42);
  const isHighlight = Math.random() < 0.05;
  const branchGreenBias = pathIndex === 0 ? 0.10 : 0.26;
  const color: ParticleColor = Math.random() < branchGreenBias ? 'green' : 'white';
  let offsetX = randomNormal() * (1.6 + endpointBloom * 8);
  const offsetY = randomNormal() * spread;

  if (progress < 0.12) {
    offsetX -= Math.random() * 150 * (1 - progress / 0.12);
  } else if (progress > 0.88) {
    offsetX += Math.random() * 140 * ((progress - 0.88) / 0.12);
  }

  return {
    kind: 'path',
    pathIndex,
    progress,
    offsetX,
    offsetY,
    radius: isHighlight ? randomBetween(0.72, 1.26) : randomBetween(0.28, 0.78),
    alpha: isHighlight ? randomBetween(0.28, 0.58) : randomBetween(0.060, 0.26),
    color,
    phase: Math.random() * Math.PI * 2,
  };
}

function createCloudDust(side: 'todo' | 'commit'): CloudDust {
  const isCommit = side === 'commit';
  const centerX = isCommit ? COMMIT_X : TODO_X;
  const centerY = isCommit ? COMMIT_Y : TODO_Y;
  const direction = isCommit ? 1 : -1;
  const core = Math.abs(randomNormal());
  const x =
    centerX +
    direction * core * randomBetween(40, isCommit ? 128 : 118) +
    randomNormal() * randomBetween(18, 52) +
    (isCommit ? randomBetween(-86, 54) : randomBetween(-42, 72));
  const y = centerY + randomNormal() * randomBetween(26, isCommit ? 76 : 68);
  const progress = clamp((x - (TODO_X - 230)) / (COMMIT_X - TODO_X + 460), 0, 1);
  const isHighlight = Math.random() < (isCommit ? 0.08 : 0.05);

  return {
    kind: 'cloud',
    x,
    y,
    progress,
    radius: isHighlight ? randomBetween(0.68, 1.42) : randomBetween(0.24, 0.88),
    alpha: isHighlight ? randomBetween(0.24, 0.58) : randomBetween(0.055, 0.24),
    color: Math.random() < (isCommit ? 0.12 : 0.18) ? 'green' : 'white',
    phase: Math.random() * Math.PI * 2,
  };
}

function createSpark(): SparkParticle {
  const progress = Math.random();
  const pathIndex = choosePathIndex(progress);

  return {
    pathIndex,
    progress,
    speed: randomBetween(0.045, 0.115),
    offsetY: randomNormal() * (pathIndex === 0 ? 1.8 : 2.8),
    radius: randomBetween(0.45, 1.05),
    alpha: randomBetween(0.18, 0.42),
    color: Math.random() < 0.18 ? 'green' : 'white',
    phase: Math.random() * Math.PI * 2,
  };
}

function createGlowSprite(size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');

  if (!context) return canvas;

  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.22, 'rgba(255, 255, 255, 0.46)');
  gradient.addColorStop(0.58, 'rgba(255, 255, 255, 0.12)');
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
  const dustRef = useRef<DustParticle[]>([]);
  const sparksRef = useRef<SparkParticle[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const visibleRef = useRef(true);
  const glowSpriteRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (reducedMotion || paths.length === 0 || !canvasRef.current || !containerRef.current) {
      return undefined;
    }

    const canvas = canvasRef.current;
    if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) {
      return undefined;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const resizeCanvas = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      glowSpriteRef.current = createGlowSprite(Math.max(48, Math.floor(72 * dpr)));
    };

    const initParticles = () => {
      const cloudCount = Math.max(
        commitNebulaCount,
        Math.round(particleCount * 0.50)
      );
      const dust: DustParticle[] = [];
      const sparkCount = Math.max(360, Math.round(particleCount * 0.16));

      for (let i = 0; i < particleCount; i += 1) {
        dust.push(createPathDust());
      }

      for (let i = 0; i < cloudCount; i += 1) {
        dust.push(createCloudDust(i % 2 === 0 ? 'commit' : 'todo'));
      }

      dustRef.current = dust;
      sparksRef.current = Array.from({ length: sparkCount }, createSpark);
    };

    const getPointOnPath = (
      path: SampledPath,
      progress: number
    ): { x: number; y: number } | null => {
      if (path.points.length === 0) return null;

      const p = clamp(progress, 0, 1);
      const rawIndex = p * (path.points.length - 1);
      const leftIndex = Math.floor(rawIndex);
      const rightIndex = Math.min(path.points.length - 1, leftIndex + 1);
      const mix = rawIndex - leftIndex;
      const left = path.points[leftIndex];
      const right = path.points[rightIndex];

      if (!left || !right) return null;

      return {
        x: left.x + (right.x - left.x) * mix,
        y: left.y + (right.y - left.y) * mix,
      };
    };

    const toScreenPoint = (x: number, y: number) => ({
      x: x * scaleX,
      y: (y - viewOffsetY) * scaleY,
    });

    const sweepBoost = (progress: number, lightProgress: number) => {
      const frontDistance = progress - lightProgress;
      const front = Math.exp(-(frontDistance * frontDistance) / (2 * 0.022 * 0.022));
      const trailDistance = lightProgress - progress;
      const trail =
        trailDistance > 0 && trailDistance < 0.22
          ? (1 - trailDistance / 0.22) * 0.72
          : 0;

      return front * 0.95 + trail * 0.66;
    };

    const drawGlow = (
      x: number,
      y: number,
      radius: number,
      alpha: number
    ) => {
      const sprite = glowSpriteRef.current;
      if (!sprite || alpha <= 0) return;

      const previousAlpha = ctx.globalAlpha;
      const size = radius * 11;
      ctx.globalAlpha = alpha;
      ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
      ctx.globalAlpha = previousAlpha;
    };

    const drawDot = (
      x: number,
      y: number,
      radius: number,
      color: ParticleColor,
      alpha: number
    ) => {
      if (alpha <= 0) return;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle =
        color === 'green'
          ? `rgba(128, 228, 140, ${alpha})`
          : `rgba(245, 245, 242, ${alpha})`;
      ctx.fill();
    };

    const drawDust = (elapsed: number, lightProgress: number) => {
      for (const particle of dustRef.current) {
        let rawPoint: { x: number; y: number } | null;

        if (particle.kind === 'path') {
          const path = paths[particle.pathIndex];
          if (!path) continue;

          rawPoint = getPointOnPath(path, particle.progress);
          if (!rawPoint) continue;
          rawPoint = {
            x: rawPoint.x + particle.offsetX,
            y: rawPoint.y + particle.offsetY,
          };
        } else {
          rawPoint = { x: particle.x, y: particle.y };
        }

        const point = toScreenPoint(rawPoint.x, rawPoint.y);
        const pulse = sweepBoost(particle.progress, lightProgress);
        const twinkle = 0.78 + Math.sin(elapsed * 1.15 + particle.phase) * 0.18;
        const alpha = clamp(particle.alpha * twinkle * (1 + pulse * 1.55), 0, 0.82);
        const radius = particle.radius * (1 + pulse * 0.65);

        if (pulse > 0.18 || particle.alpha > 0.20) {
          drawGlow(point.x, point.y, radius, alpha * 0.32);
        }
        drawDot(point.x, point.y, radius, particle.color, alpha);
      }
    };

    const drawSweepPath = (
      path: SampledPath,
      pathIndex: number,
      lightProgress: number
    ) => {
      if (lightProgress < -0.08 || lightProgress > 1.08 || path.points.length < 2) {
        return;
      }

      const start = clamp(lightProgress - 0.16, 0, 1);
      const end = clamp(lightProgress + 0.025, 0, 1);
      if (end <= 0 || start >= 1 || end <= start) return;

      const startIndex = Math.max(0, Math.floor(start * (path.points.length - 1)));
      const endIndex = Math.min(
        path.points.length - 1,
        Math.ceil(end * (path.points.length - 1))
      );

      ctx.save();
      ctx.beginPath();

      let hasPoint = false;
      for (let i = startIndex; i <= endIndex; i += 2) {
        const point = path.points[i];
        if (!point) continue;

        const screenPoint = toScreenPoint(point.x, point.y);
        if (!hasPoint) {
          ctx.moveTo(screenPoint.x, screenPoint.y);
          hasPoint = true;
        } else {
          ctx.lineTo(screenPoint.x, screenPoint.y);
        }
      }

      if (hasPoint) {
        const isMain = pathIndex === 0;
        ctx.globalCompositeOperation = 'screen';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = isMain ? 1.85 : 1.20;
        ctx.shadowBlur = isMain ? 14 : 10;
        ctx.shadowColor = isMain
          ? 'rgba(245, 245, 242, 0.46)'
          : 'rgba(128, 228, 140, 0.30)';
        ctx.strokeStyle = isMain
          ? 'rgba(245, 245, 242, 0.48)'
          : 'rgba(128, 228, 140, 0.24)';
        ctx.stroke();
      }

      ctx.restore();
    };

    const resetSpark = (spark: SparkParticle) => {
      const next = createSpark();
      spark.pathIndex = next.pathIndex;
      spark.progress = 0;
      spark.speed = next.speed;
      spark.offsetY = next.offsetY;
      spark.radius = next.radius;
      spark.alpha = next.alpha;
      spark.color = next.color;
      spark.phase = next.phase;
    };

    const drawSparks = (elapsed: number, delta: number, lightProgress: number) => {
      for (const spark of sparksRef.current) {
        const path = paths[spark.pathIndex];
        if (!path) continue;

        const previousProgress = spark.progress;
        spark.progress += spark.speed * delta;

        if (spark.progress > 1) {
          resetSpark(spark);
        }

        const point = getPointOnPath(path, spark.progress);
        if (!point) continue;

        const previousPoint = getPointOnPath(path, Math.max(0, previousProgress - 0.012));
        const screenPoint = toScreenPoint(point.x, point.y + spark.offsetY);
        const pulse = sweepBoost(spark.progress, lightProgress);
        const alpha = clamp(
          spark.alpha * (0.72 + Math.sin(elapsed * 1.8 + spark.phase) * 0.12) * (1 + pulse * 1.5),
          0,
          0.86
        );

        if (previousPoint && spark.progress > previousProgress) {
          const tail = toScreenPoint(previousPoint.x, previousPoint.y + spark.offsetY);
          ctx.beginPath();
          ctx.moveTo(tail.x, tail.y);
          ctx.lineTo(screenPoint.x, screenPoint.y);
          ctx.strokeStyle =
            spark.color === 'green'
              ? `rgba(128, 228, 140, ${alpha * 0.38})`
              : `rgba(245, 245, 242, ${alpha * 0.42})`;
          ctx.lineWidth = spark.radius * 0.85;
          ctx.lineCap = 'round';
          ctx.stroke();
        }

        if (pulse > 0.22) {
          drawGlow(screenPoint.x, screenPoint.y, spark.radius * 1.6, alpha * 0.38);
        }
        drawDot(screenPoint.x, screenPoint.y, spark.radius, spark.color, alpha);
      }
    };

    resizeCanvas();
    initParticles();

    const observer = new ResizeObserver(resizeCanvas);
    if (containerRef.current) observer.observe(containerRef.current);

    const render = (timestamp: number) => {
      if (!visibleRef.current) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }

      const delta = Math.min(0.05, (timestamp - lastTimeRef.current) / 1000);
      const elapsed = timestamp / 1000;
      const rect = containerRef.current?.getBoundingClientRect();
      lastTimeRef.current = timestamp;

      if (!rect) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      const lightProgress = ((elapsed % 5.8) / 5.8) * 1.22 - 0.10;

      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.globalCompositeOperation = 'lighter';

      drawDust(elapsed, lightProgress);
      paths.forEach((path, index) => drawSweepPath(path, index, lightProgress));
      drawSparks(elapsed, delta, lightProgress);

      ctx.globalCompositeOperation = 'source-over';
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
