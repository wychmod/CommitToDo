import { Node, Edge } from '@xyflow/react';

import { Branch } from '@/domain/entities/branch';
import { Commit } from '@/domain/entities/commit';
import { CommitType } from '@/domain/entities/enums';
import { formatDateTime } from '@/core/utils/formatters';

export interface InsightsGraphLayoutResult {
  nodes: Node[];
  edges: Edge[];
}

const CENTER_X = 320;
const BRANCH_SPACING = 160;
const COMMIT_SPACING = 84;

/**
 * Stable branch colors for the V3 insights graph.
 *
 * The main branch is always the primary green; other branches cycle through
 * launch, design and fallback accents so the palette stays consistent across
 * reloads.
 */
const BRANCH_COLOR_ORDER: string[] = [
  'var(--v3-launch)',
  'var(--v3-design)',
  '#e3a33c',
  '#e6635b',
  '#68a1ff',
];

export function buildInsightsGraphLayout(
  branches: Branch[],
  commits: Commit[]
): InsightsGraphLayoutResult {
  const sortedBranches = [...branches].sort((a, b) => {
    if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const branchColor = new Map<string, string>();
  sortedBranches.forEach((b, i) => {
    if (b.isMain) {
      branchColor.set(b.id, 'var(--v3-primary)');
    } else {
      branchColor.set(b.id, BRANCH_COLOR_ORDER[(i - 1) % BRANCH_COLOR_ORDER.length]);
    }
  });

  const branchX = new Map<string, number>();
  let leftSlots = 0;
  let rightSlots = 0;
  sortedBranches.forEach((b) => {
    if (b.isMain) {
      branchX.set(b.id, CENTER_X);
      return;
    }
    // Alternate non-main branches left and right to create the classic
    // branching/merging silhouette.
    if (leftSlots <= rightSlots) {
      leftSlots++;
      branchX.set(b.id, CENTER_X - leftSlots * BRANCH_SPACING);
    } else {
      rightSlots++;
      branchX.set(b.id, CENTER_X + rightSlots * BRANCH_SPACING);
    }
  });

  const sortedCommits = [...commits].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );
  const commitY = new Map<string, number>();
  sortedCommits.forEach((commit, index) => {
    // Recent commits at the top (smaller y), older commits below.
    const rankFromTop = sortedCommits.length - 1 - index;
    commitY.set(commit.id, rankFromTop * COMMIT_SPACING + 24);
  });

  const nodes: Node[] = commits.map((commit) => {
    const color = branchColor.get(commit.branchId) ?? 'var(--v3-text-muted)';
    const x = branchX.get(commit.branchId) ?? CENTER_X;
    const y = commitY.get(commit.id) ?? 0;
    return {
      id: commit.id,
      type: 'commitNode',
      position: { x, y },
      data: {
        label: commit.message,
        message: commit.message,
        branchColor: color,
        isMerge: commit.type === CommitType.merge,
        date: formatDateTime(commit.createdAt),
      },
    };
  });

  const edges: Edge[] = [];
  const commitsByBranch = new Map<string, Commit[]>();
  for (const commit of commits) {
    const list = commitsByBranch.get(commit.branchId) ?? [];
    list.push(commit);
    commitsByBranch.set(commit.branchId, list);
  }

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
        data: { color: branchColor.get(branch.id) },
      });
    }
  }

  // Heuristic merge edges: when a branch has a parent, draw a curve from the
  // parent branch's last commit before the first commit on this branch to the
  // merge commit (if any) on the parent branch that appears after this branch
  // started. This gives merge commits their characteristic double incoming edge.
  for (const branch of sortedBranches) {
    if (!branch.parentBranchId) continue;
    const branchCommits = (commitsByBranch.get(branch.id) ?? []).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
    const firstCommit = branchCommits[0];
    if (!firstCommit) continue;

    const parentCommits = (commitsByBranch.get(branch.parentBranchId) ?? []).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
    const mergeCommit = parentCommits.find(
      (c) => c.type === CommitType.merge && c.createdAt >= firstCommit.createdAt
    );
    if (mergeCommit) {
      edges.push({
        id: `${firstCommit.id}->${mergeCommit.id}`,
        source: firstCommit.id,
        target: mergeCommit.id,
        type: 'branchEdge',
        data: { color: branchColor.get(branch.id) },
      });
    }
  }

  return { nodes, edges };
}
