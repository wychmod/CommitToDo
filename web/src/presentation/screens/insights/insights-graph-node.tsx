import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

function InsightsGraphNodeComponent({ data, selected }: NodeProps): JSX.Element {
  const branchColor = String(data.branchColor ?? 'var(--v3-text-muted)');
  const isMerge = Boolean(data.isMerge);
  const message = String(data.message ?? '');
  const date = String(data.date ?? '');

  return (
    <div
      className="group relative flex items-center justify-center"
      title={`${message} — ${date}`}
      data-selected={selected ? 'true' : 'false'}
    >
      {isMerge || selected ? (
        <span
          className="absolute inline-flex h-[38px] w-[38px] rounded-full opacity-40"
          style={{
            backgroundColor: branchColor,
            filter: 'blur(8px)',
          }}
          aria-hidden="true"
        />
      ) : null}
      <span
        className="relative flex h-4 w-4 items-center justify-center rounded-full border-2"
        style={{
          borderColor: branchColor,
          backgroundColor: isMerge ? branchColor : 'var(--v3-bg)',
        }}
      >
        {isMerge ? (
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: 'var(--v3-bg)' }}
            aria-hidden="true"
          />
        ) : (
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: branchColor }}
            aria-hidden="true"
          />
        )}
      </span>
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

export const InsightsGraphNode = memo(InsightsGraphNodeComponent);
