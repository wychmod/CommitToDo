import { describe, expect, it } from 'vitest';

import { getPointOnPath, samplePath, toContainerPoint } from './sample-path';

function createMockPath(totalLength: number): SVGPathElement {
  const pathEl = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'path'
  );

  Object.defineProperty(pathEl, 'getTotalLength', {
    value: () => totalLength,
    configurable: true,
  });
  Object.defineProperty(pathEl, 'getPointAtLength', {
    value: (distance: number) => ({
      x: Math.min(distance, totalLength),
      y: 0,
    }),
    configurable: true,
  });

  return pathEl as SVGPathElement;
}

describe('samplePath', () => {
  it('samples points along a straight horizontal path', () => {
    const pathEl = createMockPath(100);

    const sampled = samplePath(pathEl, 10);

    expect(sampled.totalLength).toBe(100);
    expect(sampled.points.length).toBeGreaterThan(0);
    expect(sampled.points[0]).toEqual({ x: 0, y: 0 });
    expect(sampled.points[sampled.points.length - 1]).toEqual({ x: 100, y: 0 });
  });

  it('includes the final point even when step does not divide total length evenly', () => {
    const pathEl = createMockPath(37);

    const sampled = samplePath(pathEl, 10);

    expect(sampled.points[sampled.points.length - 1]).toEqual({ x: 37, y: 0 });
  });
});

describe('getPointOnPath', () => {
  it('returns the start point at progress 0', () => {
    const path = {
      points: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
      totalLength: 100,
    };

    expect(getPointOnPath(path, 0)).toEqual({ x: 0, y: 0 });
  });

  it('returns the end point at progress 1', () => {
    const path = {
      points: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
      totalLength: 100,
    };

    expect(getPointOnPath(path, 1)).toEqual({ x: 100, y: 0 });
  });

  it('clamps progress outside [0, 1]', () => {
    const path = {
      points: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
      totalLength: 100,
    };

    expect(getPointOnPath(path, -0.5)).toEqual({ x: 0, y: 0 });
    expect(getPointOnPath(path, 1.5)).toEqual({ x: 100, y: 0 });
  });
});

describe('toContainerPoint', () => {
  it('maps an SVG point into container space with offset and scale', () => {
    const svgPoint = { x: 348, y: 350 };

    const containerPoint = toContainerPoint(svgPoint, 1, 1, 220);

    expect(containerPoint).toEqual({ x: 348, y: 130 });
  });

  it('applies scale factors to both axes', () => {
    const svgPoint = { x: 790, y: 352 };

    const containerPoint = toContainerPoint(svgPoint, 0.5, 0.75, 220);

    expect(containerPoint).toEqual({ x: 395, y: 99 });
  });

  it('handles points above the visible band', () => {
    const svgPoint = { x: 100, y: 200 };

    const containerPoint = toContainerPoint(svgPoint, 1, 1, 220);

    expect(containerPoint).toEqual({ x: 100, y: -20 });
  });
});
