import { Node, Edge } from '@xyflow/react';
import { Repository } from '../../../domain/entities/repository';
import { Branch } from '../../../domain/entities/branch';
import { Commit } from '../../../domain/entities/commit';
import { CommitType } from '../../../domain/entities/enums';
import { formatDateTime } from '../../../core/utils/formatters';

const BRANCH_COLORS = [
  '#3B82F6',
  '#8B5CF6',
  '#F59E0B',
  '#10B981',
  '#EC4899',
  '#06B6D4',
  '#F97316',
];

export interface GraphLayoutResult {
  nodes: Node[];
  edges: Edge[];
}

export function buildGraphLayout(
  repositories: Repository[],
  branches: Branch[],
  commits: Commit[]
): GraphLayoutResult {
  void repositories;

  const sortedBranches = [...branches].sort((a, b) => {
    if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const branchColumn = new Map<string, number>();
  sortedBranches.forEach((b, i) => branchColumn.set(b.id, i));
  const branchColor = new Map<string, string>();
  sortedBranches.forEach((b, i) => branchColor.set(b.id, BRANCH_COLORS[i % BRANCH_COLORS.length]));

  const commitsByBranch = new Map<string, Commit[]>();
  for (const commit of commits) {
    const list = commitsByBranch.get(commit.branchId) ?? [];
    list.push(commit);
    commitsByBranch.set(commit.branchId, list);
  }

  let globalRow = 0;
  const nodes: Node[] = [];

  for (const branch of sortedBranches) {
    const list = (commitsByBranch.get(branch.id) ?? []).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
    list.forEach((commit, index) => {
      const color = branchColor.get(branch.id)!;
      nodes.push({
        id: commit.id,
        type: 'commitNode',
        position: { x: branchColumn.get(branch.id)! * 140 + 24, y: globalRow + index * 70 + 24 },
        data: {
          label: commit.message,
          message: commit.message,
          branchColor: color,
          isMerge: commit.type === CommitType.merge,
          date: formatDateTime(commit.createdAt),
        },
      });
    });
    globalRow += Math.max(list.length, 1) * 70;
  }

  const edges: Edge[] = [];
  for (const branch of sortedBranches) {
    const list = (commitsByBranch.get(branch.id) ?? []).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
    for (let i = 1; i < list.length; i++) {
      edges.push({
        id: `${list[i - 1].id}->${list[i].id}`,
        source: list[i - 1].id,
        target: list[i].id,
        type: 'branchEdge',
        data: { color: branchColor.get(branch.id)! },
      });
    }
  }

  return { nodes, edges };
}
