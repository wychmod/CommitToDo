import Dexie, { Table } from 'dexie';
import { BranchRecord } from '../models/branch-model';
import { CommitRecord } from '../models/commit-model';
import { RepositoryRecord } from '../models/repository-model';
import { TaskRecord } from '../models/task-model';

export interface TagRecord {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface TaskTagRecord {
  taskId: string;
  tagId: string;
  createdAt: string;
}

export class AppDatabase extends Dexie {
  repositories!: Table<RepositoryRecord, string>;
  branches!: Table<BranchRecord, string>;
  tasks!: Table<TaskRecord, string>;
  commits!: Table<CommitRecord, string>;
  tags!: Table<TagRecord, string>;
  taskTags!: Table<TaskTagRecord, [string, string]>;

  constructor() {
    super('commit-db');

    this.version(1).stores({
      repositories: 'id, isArchived, isDeleted',
      branches: 'id, repositoryId, parentBranchId, isDeleted',
      tasks: 'id, branchId, status, dueDate, parentTaskId, isDeleted, sortOrder',
      commits: 'id, taskId, branchId, createdAt',
      tags: 'id, name',
      taskTags: '[taskId+tagId], taskId, tagId',
    });

    this.version(2).stores({
      repositories: 'id, isArchived, isDeleted',
      branches:
        'id, repositoryId, parentBranchId, isDeleted, [repositoryId+isDeleted]',
      tasks:
        'id, branchId, status, dueDate, parentTaskId, isDeleted, sortOrder, [branchId+isDeleted]',
      commits: 'id, taskId, branchId, createdAt',
      tags: 'id, name',
      taskTags: '[taskId+tagId], taskId, tagId',
    });
  }
}

export const appDatabase = new AppDatabase();
