import { Repository } from '../../domain/entities/repository';
import { IRepositoryRepository } from '../../domain/repositories/i-repository-repository';
import { AppDatabase } from '../db/app-database';
import { RepositoryModel } from '../models/repository-model';

export class DexieRepositoryRepository implements IRepositoryRepository {
  constructor(private db: AppDatabase) {}

  async getAll(): Promise<Repository[]> {
    const records = await this.db.repositories
      .where('isDeleted')
      .equals(0)
      .sortBy('updatedAt');
    return records.map(RepositoryModel.toEntity).reverse();
  }

  async getById(id: string): Promise<Repository | null> {
    const record = await this.db.repositories.get(id);
    if (!record || record.isDeleted === 1) return null;
    return RepositoryModel.toEntity(record);
  }

  async create(repository: Repository): Promise<Repository> {
    const record = RepositoryModel.toRecord(repository);
    await this.db.repositories.add(record);
    return RepositoryModel.toEntity(record);
  }

  async update(repository: Repository): Promise<Repository> {
    const record = RepositoryModel.toRecord(repository);
    await this.db.repositories.put(record);
    return RepositoryModel.toEntity(record);
  }

  async delete(id: string): Promise<void> {
    const record = await this.db.repositories.get(id);
    if (!record) return;
    await this.db.repositories.update(id, {
      ...record,
      isDeleted: 1,
      updatedAt: new Date().toISOString(),
    });
  }

  async restore(id: string): Promise<void> {
    const record = await this.db.repositories.get(id);
    if (!record) return;
    await this.db.repositories.update(id, {
      ...record,
      isDeleted: 0,
      updatedAt: new Date().toISOString(),
    });
  }

  async search(query: string): Promise<Repository[]> {
    const lower = query.toLowerCase();
    const records = await this.db.repositories.where('isDeleted').equals(0).sortBy('updatedAt');
    return records
      .filter((record) => record.name.toLowerCase().includes(lower))
      .map(RepositoryModel.toEntity)
      .reverse();
  }

  async clear(): Promise<void> {
    await this.db.repositories.clear();
  }
}
