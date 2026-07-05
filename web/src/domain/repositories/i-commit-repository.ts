import { Commit } from '../entities/commit';

export interface ICommitRepository {
  getByTaskId(taskId: string): Promise<Commit[]>;
  getByBranchId(branchId: string): Promise<Commit[]>;
  create(commit: Commit): Promise<Commit>;
  clear(): Promise<void>;
}
