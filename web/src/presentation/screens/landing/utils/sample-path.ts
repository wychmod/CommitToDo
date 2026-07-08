export interface PathPoint {
  x: number;
  y: number;
}

export interface SampledPath {
  points: PathPoint[];
  totalLength: number;
}

export function samplePath(pathElement: SVGPathElement, step = 2): SampledPath {
  const totalLength = pathElement.getTotalLength();
  const points: PathPoint[] = [];

  for (let distance = 0; distance <= totalLength; distance += step) {
    const point = pathElement.getPointAtLength(distance);
    points.push({ x: point.x, y: point.y });
  }

  // Ensure the final point is always included.
  if (points.length === 0 || points[points.length - 1].x !== totalLength) {
    const last = pathElement.getPointAtLength(totalLength);
    points.push({ x: last.x, y: last.y });
  }

  return { points, totalLength };
}

export function getPointOnPath(
  path: SampledPath,
  progress: number
): PathPoint {
  const clamped = Math.max(0, Math.min(1, progress));
  const targetDistance = clamped * path.totalLength;
  const index = Math.min(
    path.points.length - 1,
    Math.floor(targetDistance / 2)
  );
  return path.points[index] ?? path.points[path.points.length - 1];
}

/**
 * Map a point from SVG viewBox coordinates to container coordinates,
 * accounting for the visible vertical offset and responsive scaling.
 */
export function toContainerPoint(
  svgPoint: PathPoint,
  scaleX: number,
  scaleY: number,
  viewOffsetY: number
): PathPoint {
  return {
    x: svgPoint.x * scaleX,
    y: (svgPoint.y - viewOffsetY) * scaleY,
  };
}
