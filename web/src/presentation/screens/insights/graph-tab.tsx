import * as React from 'react';
import {
  Background,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Branch } from '@/domain/entities/branch';
import { Commit } from '@/domain/entities/commit';
import { Repository } from '@/domain/entities/repository';
import { InsightsGraphNode } from './insights-graph-node';
import { InsightsGraphEdge } from './insights-graph-edge';
import { buildInsightsGraphLayout } from './graph-layout';
import { ZoomControls } from './zoom-controls';

export interface GraphTabProps {
  commits: Commit[];
  branches: Branch[];
  repositories: Repository[];
  selectedCommit: Commit | null;
  onSelectCommit: (commit: Commit) => void;
}

const nodeTypes = { commitNode: InsightsGraphNode };
const edgeTypes = { branchEdge: InsightsGraphEdge };

function GraphCanvas({
  commits,
  branches,
  selectedCommit,
  onSelectCommit,
}: GraphTabProps): JSX.Element {
  const { fitView, zoomIn, zoomOut, getViewport } = useReactFlow();
  const [zoom, setZoom] = React.useState(1);

  const { nodes, edges } = React.useMemo(
    () => buildInsightsGraphLayout(branches, commits),
    [branches, commits]
  );

  React.useEffect(() => {
    const id = window.setTimeout(() => fitView({ padding: 0.15 }), 50);
    return () => window.clearTimeout(id);
  }, [nodes, edges, fitView]);

  const handleNodeClick = React.useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const commit = commits.find((c) => c.id === node.id) ?? null;
      if (commit) onSelectCommit(commit);
    },
    [commits, onSelectCommit]
  );

  const handleMoveEnd = React.useCallback(() => {
    setZoom(getViewport().zoom);
  }, [getViewport]);

  const mainBranch = React.useMemo(
    () => branches.find((b) => b.isMain)?.name ?? 'main',
    [branches]
  );

  const nonMainBranches = React.useMemo(
    () => branches.filter((b) => !b.isMain).length,
    [branches]
  );

  return (
    <div className="relative flex h-full min-h-[520px] flex-col overflow-hidden rounded-[var(--v3-radius-lg)] border border-[var(--v3-border)] bg-[var(--v3-bg-near)]">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--v3-divider)] px-5 py-4">
        <div>
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--v3-text-muted)]">
            时间
          </span>
          <h3 className="mt-0.5 text-[18px] font-semibold text-[var(--v3-text-strong)]">
            LIFE GRAPH
          </h3>
          <p className="mt-1 text-[12px] text-[var(--v3-text-muted)]">
            主干 {commits.filter((c) => c.branchId === branches.find((b) => b.isMain)?.id).length} 次提交 · {nonMainBranches} 条阶段分支 · 连续推进 {computeActiveDays(commits)} 天
          </p>
        </div>
      </header>

      <div className="relative flex-1">
        <ReactFlow
          nodes={nodes.map((n) => ({
            ...n,
            selected: n.id === selectedCommit?.id,
          }))}
          edges={edges as Edge[]}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={handleNodeClick}
          onMoveEnd={handleMoveEnd}
          minZoom={0.3}
          maxZoom={2}
          nodesDraggable={false}
          nodesConnectable={false}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background
            gap={28}
            size={1}
            color="var(--v3-primary-soft)"
          />
        </ReactFlow>

        <ZoomControls
          zoom={zoom}
          onZoomIn={() => zoomIn({ duration: 200 })}
          onZoomOut={() => zoomOut({ duration: 200 })}
          onReset={() => fitView({ padding: 0.15 })}
          className="absolute bottom-4 left-4 z-10"
        />

        <div className="pointer-events-none absolute right-4 top-4 z-10 rounded-[var(--v3-radius-md)] border border-[var(--v3-border)] bg-[var(--v3-card)] px-3 py-1.5 text-[11px] text-[var(--v3-text-muted)]">
          <span className="font-medium text-[var(--v3-primary)]">{mainBranch}</span> · {commits.length} 提交
        </div>
      </div>
    </div>
  );
}

function computeActiveDays(commits: Commit[]): number {
  if (commits.length === 0) return 0;
  const dates = new Set(
    commits.map((c) => c.createdAt.toISOString().slice(0, 10))
  );
  return dates.size;
}

export function GraphTab(props: GraphTabProps): JSX.Element {
  return (
    <ReactFlowProvider>
      <GraphCanvas {...props} />
    </ReactFlowProvider>
  );
}
