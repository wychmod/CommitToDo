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
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
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
import { AppButton } from '../components/common/app-button';
import { CommitNode } from '../components/graph/commit-node';
import { BranchEdge } from '../components/graph/branch-edge';
import { buildGraphLayout } from '../components/graph/graph-layout';

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
    const load = async () => {
      const repoRepo = container.resolve<IRepositoryRepository>('IRepositoryRepository');
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
    load();
  }, []);

  useEffect(() => {
    const { nodes, edges } = buildGraphLayout(repositories, branches, commits);
    setNodes(nodes);
    setEdges(edges);
    setTimeout(() => fitView({ padding: 0.2 }), 50);
  }, [repositories, branches, commits, setNodes, setEdges, fitView]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const commit = commits.find((c) => c.id === node.id) ?? null;
      setSelectedCommit(commit);
    },
    [commits]
  );

  if (isLoading) {
    return <p className="text-body text-ink-muted">加载中…</p>;
  }

  return (
    <div className="flex h-full flex-col gap-md">
      <div className="flex items-center justify-between">
        <h1 className="text-headline font-semibold text-ink">Git Graph</h1>
        <div className="flex items-center gap-xs">
          <AppButton size="icon" variant="secondary" onClick={() => fitView({ padding: 0.2 })}>
            <RotateCcw className="h-4 w-4" />
          </AppButton>
          <AppButton size="icon" variant="secondary" onClick={() => fitView({ padding: 0.2 })}>
            <ZoomIn className="h-4 w-4" />
          </AppButton>
          <AppButton size="icon" variant="secondary" onClick={() => fitView({ padding: 0.2 })}>
            <ZoomOut className="h-4 w-4" />
          </AppButton>
        </div>
      </div>

      <div className="relative flex-1 min-h-[400px] rounded-xl border border-hairline bg-canvas">
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
        >
          <Background gap={20} size={1} color="#334155" />
          <Controls className="bg-surface-1 text-ink" />
          <Panel position="top-left" className="rounded-md bg-surface-1/80 p-xs text-mono-sm text-ink-muted">
            {repositories.length} 仓库 · {branches.length} 分支 · {commits.length} 提交
          </Panel>
        </ReactFlow>
      </div>

      {selectedCommit && (
        <div className="rounded-lg border border-hairline bg-surface-1 p-md">
          <div className="flex items-center justify-between">
            <h3 className="text-card-title font-medium text-ink">{selectedCommit.message}</h3>
            <button
              type="button"
              onClick={() => setSelectedCommit(null)}
              className="text-ink-muted hover:text-ink"
            >
              关闭
            </button>
          </div>
          <p className="mt-xs text-mono-sm text-ink-subtle">
            {CommitType.label(selectedCommit.type)} · {formatDateTime(selectedCommit.createdAt)}
          </p>
        </div>
      )}
    </div>
  );
}

export function GitGraphScreen(): JSX.Element {
  return (
    <div className="h-[calc(100vh-160px)]">
      <ReactFlowProvider>
        <GraphCanvas />
      </ReactFlowProvider>
    </div>
  );
}
