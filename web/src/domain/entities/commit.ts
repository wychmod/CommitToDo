import { v4 as uuidv4 } from 'uuid';
import { CommitType } from './enums';

export interface CommitData {
  id: string;
  taskId: string;
  branchId: string;
  message: string;
  type: CommitType;
  createdAt: Date;
}

export class Commit implements CommitData {
  id: string;
  taskId: string;
  branchId: string;
  message: string;
  type: CommitType;
  createdAt: Date;

  constructor(data: CommitData) {
    this.id = data.id;
    this.taskId = data.taskId;
    this.branchId = data.branchId;
    this.message = data.message;
    this.type = data.type;
    this.createdAt = data.createdAt;
  }

  static create(
    taskId: string,
    branchId: string,
    message: string,
    type: CommitType
  ): Commit {
    return new Commit({
      id: uuidv4(),
      taskId,
      branchId,
      message,
      type,
      createdAt: new Date(),
    });
  }

  copyWith(updates: Partial<CommitData>): Commit {
    return new Commit({
      ...this,
      ...updates,
    });
  }

  toJson(): Record<string, unknown> {
    return {
      id: this.id,
      taskId: this.taskId,
      branchId: this.branchId,
      message: this.message,
      type: this.type,
      createdAt: this.createdAt.toISOString(),
    };
  }
}
