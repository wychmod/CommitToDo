import { CommitType } from '../../domain/entities/enums';
import { Commit } from '../../domain/entities/commit';

export interface CommitRecord {
  id: string;
  taskId: string;
  branchId: string;
  message: string;
  type: number;
  createdAt: string;
}

export const CommitModel = {
  toRecord(entity: Commit): CommitRecord {
    return {
      id: entity.id,
      taskId: entity.taskId,
      branchId: entity.branchId,
      message: entity.message,
      type: entity.type,
      createdAt: entity.createdAt.toISOString(),
    };
  },

  toEntity(record: CommitRecord): Commit {
    return new Commit({
      id: record.id,
      taskId: record.taskId,
      branchId: record.branchId,
      message: record.message,
      type: CommitType.fromValue(record.type),
      createdAt: new Date(record.createdAt),
    });
  },
};
