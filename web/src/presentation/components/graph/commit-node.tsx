import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

function CommitNodeComponent({ data, selected }: NodeProps): JSX.Element {
  const branchColor = String(data.branchColor ?? '#64748B');
  const isMerge = Boolean(data.isMerge);
  const message = String(data.message ?? '');
  const date = String(data.date ?? '');
  const ringColor = isMerge ? '#3B82F6' : branchColor;

  return (
    <div
      className={`relative flex h-8 w-8 items-center justify-center rounded-full ${
        selected ? 'ring-2 ring-primary' : ''
      }`}
      style={{ backgroundColor: ringColor }}
      title={`${message} — ${date}`}
    >
      <div className="h-4 w-4 rounded-full bg-canvas" />
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

export const CommitNode = memo(CommitNodeComponent);
