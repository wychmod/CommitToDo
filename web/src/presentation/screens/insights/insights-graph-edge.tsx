import { memo } from 'react';
import { BaseEdge, EdgeProps, getBezierPath } from '@xyflow/react';

function InsightsGraphEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: EdgeProps): JSX.Element {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const color = String(
    (data as Record<string, unknown> | undefined)?.color ?? 'var(--v3-text-muted)'
  );

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        stroke: color,
        strokeWidth: 2,
      }}
    />
  );
}

export const InsightsGraphEdge = memo(InsightsGraphEdgeComponent);
