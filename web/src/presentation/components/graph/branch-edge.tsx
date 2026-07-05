import { memo } from 'react';
import { BaseEdge, EdgeProps, getBezierPath } from '@xyflow/react';

function BranchEdgeComponent({
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

  const color = String((data as Record<string, unknown> | undefined)?.color ?? '#64748B');

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

export const BranchEdge = memo(BranchEdgeComponent);
