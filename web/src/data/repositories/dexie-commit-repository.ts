import { Commit } from '../../domain/entities/commit';
import { ICommitRepository } from '../../domain/repositories/i-commit-repository';
import { AppDatabase } from '../db/app-database';
import { CommitModel } from '../models/commit-model';

export class DexieCommitRepository implements ICommitRepository {
  constructor(private db: AppDatabase) {}

  async getByTaskId(taskId: string): Promise<Commit[]> {
    const records = await this.db.commits
      .where('taskId')
      .equals(taskId)
      .sortBy('createdAt');
    return records.map(CommitModel.toEntity).reverse();
  }

  async getByBranchId(branchId: string): Promise<Commit[]> {
    const records = await this.db.commits
      .where('branchId')
      .equals(branchId)
      .sortBy('createdAt');
    return records.map(CommitModel.toEntity).reverse();
  }

  async create(commit: Commit): Promise<Commit> {
    const record = CommitModel.toRecord(commit);
    await this.db.commits.add(record);
    return CommitModel.toEntity(record);
  }

  async clear(): Promise<void> {
    await this.db.commits.clear();
  }
}
