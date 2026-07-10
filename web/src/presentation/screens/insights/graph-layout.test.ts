import { describe, expect, it } from 'vitest';

import { Branch } from '@/domain/entities/branch';
import { Commit } from '@/domain/entities/commit';
import { CommitType } from '@/domain/entities/enums';
import { Repository } from '@/domain/entities/repository';

import { buildInsightsGraphLayout } from './graph-layout';

describe('buildInsightsGraphLayout', () => {
  const repo = new Repository({
    id: 'repo-1',
    name: 'Repo',
    icon: 'repository',
    color: '#3B82F6',
    description: null,
    defaultBranchId: null,
    isArchived: false,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it('places the main branch at the center column', () => {
    const main = Branch.main(repo.id);
    const commit = Commit.create('task-1', main.id, 'Initial', CommitType.create);

    const { nodes } = buildInsightsGraphLayout([main], [commit]);

    expect(nodes).toHaveLength(1);
    expect(nodes[0].position.x).toBe(320);
  });

  it('alternates non-main branches left and right of center', () => {
    const main = Branch.main(repo.id);
    const left = Branch.create(repo.id, 'feature-left', { parentBranchId: main.id });
    const right = Branch.create(repo.id, 'feature-right', { parentBranchId: main.id });
    const c1 = Commit.create('task-1', main.id, 'Main', CommitType.create);
    const c2 = Commit.create('task-2', left.id, 'Left', CommitType.create);
    const c3 = Commit.create('task-3', right.id, 'Right', CommitType.create);

    const { nodes } = buildInsightsGraphLayout([main, left, right], [c1, c2, c3]);

    const mainNode = nodes.find((n) => n.id === c1.id);
    const leftNode = nodes.find((n) => n.id === c2.id);
    const rightNode = nodes.find((n) => n.id === c3.id);

    expect(mainNode?.position.x).toBe(320);
    expect(leftNode?.position.x).toBeLessThan(320);
    expect(rightNode?.position.x).toBeGreaterThan(320);
  });

  it('orders commits by time with the most recent at the top', () => {
    const main = Branch.main(repo.id);
    const old = Commit.create('task-1', main.id, 'Old', CommitType.create);
    old.createdAt = new Date('2026-01-01T10:00:00');
    const recent = Commit.create('task-2', main.id, 'Recent', CommitType.update);
    recent.createdAt = new Date('2026-01-02T10:00:00');

    const { nodes } = buildInsightsGraphLayout([main], [old, recent]);

    const oldNode = nodes.find((n) => n.id === old.id);
    const recentNode = nodes.find((n) => n.id === recent.id);

    expect(recentNode!.position.y).toBeLessThan(oldNode!.position.y);
  });

  it('creates edges between consecutive commits on the same branch', () => {
    const main = Branch.main(repo.id);
    const c1 = Commit.create('task-1', main.id, 'First', CommitType.create);
    const c2 = Commit.create('task-2', main.id, 'Second', CommitType.update);

    const { edges } = buildInsightsGraphLayout([main], [c1, c2]);

    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe(c1.id);
    expect(edges[0].target).toBe(c2.id);
  });

  it('flags merge commits in node data', () => {
    const main = Branch.main(repo.id);
    const merge = Commit.create('task-1', main.id, 'Merge', CommitType.merge);

    const { nodes } = buildInsightsGraphLayout([main], [merge]);

    expect(nodes[0].data.isMerge).toBe(true);
  });

  it('assigns stable branch colors', () => {
    const main = Branch.main(repo.id);
    const feature = Branch.create(repo.id, 'feature', { parentBranchId: main.id });
    const c1 = Commit.create('task-1', main.id, 'Main', CommitType.create);
    const c2 = Commit.create('task-2', feature.id, 'Feature', CommitType.create);

    const { nodes } = buildInsightsGraphLayout([main, feature], [c1, c2]);

    const mainNode = nodes.find((n) => n.id === c1.id);
    const featureNode = nodes.find((n) => n.id === c2.id);

    expect(mainNode?.data.branchColor).toBe('var(--v3-primary)');
    expect(featureNode?.data.branchColor).toBe('var(--v3-launch)');
  });
});
