import { describe, expect, it } from 'vitest';
import { Repository } from '../../../domain/entities/repository';
import { Branch } from '../../../domain/entities/branch';
import { Commit } from '../../../domain/entities/commit';
import { CommitType } from '../../../domain/entities/enums';
import { buildGraphLayout } from './graph-layout';

describe('Git Graph layout', () => {
  it('assigns columns by branch order with main first', () => {
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
    const main = Branch.main(repo.id);
    const feature = Branch.create(repo.id, 'feature', { parentBranchId: main.id });
    const commit = Commit.create('task-1', main.id, 'Initial', CommitType.create);

    const { nodes, edges } = buildGraphLayout([repo], [main, feature], [commit]);

    expect(nodes).toHaveLength(1);
    expect(nodes[0].position.x).toBe(24);
    expect(edges).toHaveLength(0);
  });

  it('creates edges between consecutive commits in the same branch', () => {
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
    const main = Branch.main(repo.id);
    const c1 = Commit.create('task-1', main.id, 'First', CommitType.create);
    const c2 = Commit.create('task-2', main.id, 'Second', CommitType.update);

    const { edges } = buildGraphLayout([repo], [main], [c1, c2]);
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe(c1.id);
    expect(edges[0].target).toBe(c2.id);
  });
});
