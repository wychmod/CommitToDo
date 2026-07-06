import { useEffect, useState, useCallback } from 'react';
import {
  Background,
  Controls,
  ReactFlow,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  ReactFlowProvider,
  useReactFlow,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Network,
} from 'lucide-react';
import { useIsMobile } from '../../core/hooks/use-is-mobile';
import { container } from '../../core/di/injection-container';
import { IRepositoryRepository } from '../../domain/repositories/i-repository-repository';
import { IBranchRepository } from '../../domain/repositories/i-branch-repository';
import { ICommitRepository } from '../../domain/repositories/i-commit-repository';
import { Repository } from '../../domain/entities/repository';
import { Branch } from '../../domain/entities/branch';
import { Commit } from '../../domain/entities/commit';
import { CommitType } from '../../domain/entities/enums';
import { formatDateTime } from '../../core/utils/formatters';
import { CommitNode } from '../components/graph/commit-node';
import { BranchEdge } from '../components/graph/branch-edge';
import { buildGraphLayout } from '../components/graph/graph-layout';
import { AppButton } from '../components/common/app-button';

const nodeTypes = { commitNode: CommitNode };
const edgeTypes = { branchEdge: BranchEdge };

function GraphCanvas(): JSX.Element {
  const isMobile = useIsMobile();
  const { fitView } = useReactFlow();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    const load = async (): Promise<void> => {
      const repoRepo =
        container.resolve<IRepositoryRepository>('IRepositoryRepository');
      const branchRepo = container.resolve<IBranchRepository>('IBranchRepository');
      const commitRepo = container.resolve<ICommitRepository>('ICommitRepository');

      const repos = await repoRepo.getAll();
      const allBranches: Branch[] = [];
      const allCommits: Commit[] = [];
      for (const repo of repos) {
        const branches = await branchRepo.getByRepositoryId(repo.id);
        allBranches.push(...branches);
        for (const branch of branches) {
          const commits = await commitRepo.getByBranchId(branch.id);
          allCommits.push(...commits);
        }
      }
      setRepositories(repos);
      setBranches(allBranches);
      setCommits(allCommits);
      setIsLoading(false);
    };
    void load();
  }, []);

  useEffect(() => {
    const { nodes, edges } = buildGraphLayout(repositories, branches, commits);
    setNodes(nodes);
    setEdges(edges);
    const id = window.setTimeout(() => fitView({ padding: 0.2 }), 50);
    return () => window.clearTimeout(id);
  }, [repositories, branches, commits, setNodes, setEdges, fitView]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const commit = commits.find((c) => c.id === node.id) ?? null;
      setSelectedCommit(commit);
    },
    [commits]
  );

  if (isLoading) {
    return (
      <div className="work-main">
        <div className="work-main-pad">
          <div className="empty-state">
            <span className="empty-state-title">正在加载图谱…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="work-main">
      <div className="work-main-pad page-container">
        <header className="flex flex-wrap items-end justify-between gap-md">
          <div className="flex flex-col gap-xs">
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-subtle">
              Visualization
            </span>
            <h1 className="flex items-center gap-sm text-[22px] font-semibold leading-tight text-ink">
              <Network className="h-5 w-5 text-primary" aria-hidden /> Git Graph
            </h1>
            <p className="font-mono text-[12px] text-ink-muted">
              {repositories.length} 仓库 · {branches.length} 分支 ·{' '}
              {commits.length} 提交
            </p>
          </div>
          <div className="flex items-center gap-xs">
            <AppButton
              size="sm"
              variant="secondary"
              onClick={() => fitView({ padding: 0.2 })}
            >
              <RotateCcw className="h-4 w-4" /> 重置视图
            </AppButton>
            <AppButton
              size="icon"
              variant="secondary"
              onClick={() => fitView({ padding: 0.2 })}
              aria-label="缩小"
            >
              <ZoomOut className="h-4 w-4" />
            </AppButton>
            <AppButton
              size="icon"
              variant="secondary"
              onClick={() => fitView({ padding: 0.2 })}
              aria-label="放大"
            >
              <ZoomIn className="h-4 w-4" />
            </AppButton>
          </div>
        </header>

        <div className="data-canvas scanline" style={{ minHeight: 460 }}>
          <span className="data-canvas-grid" aria-hidden />
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            minZoom={isMobile ? 0.3 : 0.5}
            maxZoom={2}
            nodesDraggable={false}
            nodesConnectable={false}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={28} size={1} color="rgba(132, 210, 205, 0.18)" />
            <Controls className="!bg-surface !text-ink !border !border-border" />
            <Panel
              position="top-left"
              className="!m-2 !rounded !bg-canvas-elevated !px-2 !py-1 !text-[11px] !text-ink-muted !font-mono !border !border-border"
            >
              {repositories.length} repo · {branches.length} branch ·{' '}
              {commits.length} commit
            </Panel>
          </ReactFlow>
        </div>

        {selectedCommit ? (
          <section className="panel">
            <header className="panel-header">
              <span className="panel-title">{selectedCommit.message}</span>
              <button
                type="button"
                onClick={() => setSelectedCommit(null)}
                className="font-mono text-[11px] text-ink-muted hover:text-ink"
              >
                关闭
              </button>
            </header>
            <div className="panel-body">
              <div className="commit-row-meta">
                <span>{CommitType.label(selectedCommit.type)}</span>
                <span>·</span>
                <span>{formatDateTime(selectedCommit.createdAt)}</span>
                <span>·</span>
                <span className="font-mono">#{selectedCommit.id.slice(0, 7)}</span>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

export function GitGraphScreen(): JSX.Element {
  return (
    <ReactFlowProvider>
      <GraphCanvas />
    </ReactFlowProvider>
  );
}
