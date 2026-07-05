import { Branch } from '../../domain/entities/branch';
import { IBranchRepository } from '../../domain/repositories/i-branch-repository';
import { AppDatabase } from '../db/app-database';
import { BranchModel } from '../models/branch-model';

export class DexieBranchRepository implements IBranchRepository {
  constructor(private db: AppDatabase) {}

  async getAll(): Promise<Branch[]> {
    const records = await this.db.branches.where('isDeleted').equals(0).sortBy('createdAt');
    return records.map(BranchModel.toEntity);
  }

  async getByRepositoryId(repositoryId: string): Promise<Branch[]> {
    const records = await this.db.branches
      .where({ repositoryId, isDeleted: 0 })
      .sortBy('createdAt');
    return records.map(BranchModel.toEntity);
  }

  async getById(id: string): Promise<Branch | null> {
    const record = await this.db.branches.get(id);
    if (!record || record.isDeleted === 1) return null;
    return BranchModel.toEntity(record);
  }

  async create(branch: Branch): Promise<Branch> {
    const record = BranchModel.toRecord(branch);
    await this.db.branches.add(record);
    return BranchModel.toEntity(record);
  }

  async update(branch: Branch): Promise<Branch> {
    const record = BranchModel.toRecord(branch);
    await this.db.branches.put(record);
    return BranchModel.toEntity(record);
  }

  async delete(id: string): Promise<void> {
    const record = await this.db.branches.get(id);
    if (!record) return;
    await this.db.branches.update(id, {
      ...record,
      isDeleted: 1,
      updatedAt: new Date().toISOString(),
    });
  }

  async search(query: string): Promise<Branch[]> {
    const lower = query.toLowerCase();
    const records = await this.db.branches.where('isDeleted').equals(0).sortBy('createdAt');
    return records
      .filter((record) => record.name.toLowerCase().includes(lower))
      .map(BranchModel.toEntity);
  }

  async clear(): Promise<void> {
    await this.db.branches.clear();
  }
}
