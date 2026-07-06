import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { container } from '../../core/di/injection-container';
import { IRepositoryRepository } from '../../domain/repositories/i-repository-repository';
import { IBranchRepository } from '../../domain/repositories/i-branch-repository';
import { ICommitRepository } from '../../domain/repositories/i-commit-repository';
import { useRepositoryStore } from '../stores/repository-store';
import { Repository } from '../../domain/entities/repository';
import { Branch } from '../../domain/entities/branch';
import { Commit } from '../../domain/entities/commit';
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  Panel,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { buildGraphLayout } from '../components/graph/graph-layout';
import { CommitNode } from '../components/graph/commit-node';
import { BranchEdge } from '../components/graph/branch-edge';
import { AppButton } from '../components/common/app-button';
import { RotateCcw, Network } from 'lucide-react';

const nodeTypes = { commitNode: CommitNode };
const edgeTypes = { branchEdge: BranchEdge };

function RepoGraphInner({
  repositoryId,
}: {
  repositoryId: string;
}): JSX.Element {
  const { fitView } = useReactFlow();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async (): Promise<void> => {
      setIsLoading(true);
      const repoRepo =
        container.resolve<IRepositoryRepository>('IRepositoryRepository');
      const branchRepo =
        container.resolve<IBranchRepository>('IBranchRepository');
      const commitRepo =
        container.resolve<ICommitRepository>('ICommitRepository');
      const repo = await repoRepo.getById(repositoryId);
      if (!repo) {
        if (!cancelled) setIsLoading(false);
        return;
      }
      const branchesForRepo = await branchRepo.getByRepositoryId(repositoryId);
      const commitsLists = await Promise.all(
        branchesForRepo.map((b) => commitRepo.getByBranchId(b.id))
      );
      if (cancelled) return;
      setRepositories([repo]);
      setBranches(branchesForRepo);
      setCommits(commitsLists.flat());
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [repositoryId]);

  const layout = buildGraphLayout(repositories, branches, commits);

  if (isLoading) {
    return (
      <div className="work-main">
        <div className="work-main-pad">
          <div className="empty-state">
            <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
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
              In-repo Graph
            </span>
            <h1 className="flex items-center gap-sm text-[22px] font-semibold leading-tight text-ink">
              <Network className="h-5 w-5 text-primary" aria-hidden /> 仓库图谱
            </h1>
            <p className="font-mono text-[12px] text-ink-muted">
              {branches.length} 分支 · {commits.length} 提交
            </p>
          </div>
          <AppButton
            size="sm"
            variant="secondary"
            onClick={() => fitView({ padding: 0.2 })}
          >
            <RotateCcw className="h-4 w-4" /> 重置视图
          </AppButton>
        </header>
        <div className="data-canvas scanline" style={{ minHeight: 460 }}>
          <span className="data-canvas-grid" aria-hidden />
          <ReactFlow
            nodes={layout.nodes as Node[]}
            edges={layout.edges as Edge[]}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            minZoom={0.3}
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
              {branches.length} 分支 · {commits.length} 提交
            </Panel>
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

export function RepoGraphScreen(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { loadData } = useRepositoryStore();
  useEffect(() => {
    if (id) void loadData(id);
  }, [id, loadData]);

  if (!id) return <div />;
  return (
    <ReactFlowProvider>
      <RepoGraphInner repositoryId={id} />
    </ReactFlowProvider>
  );
}
