import { Repository } from '../entities/repository';

export interface IRepositoryRepository {
  getAll(): Promise<Repository[]>;
  getById(id: string): Promise<Repository | null>;
  create(repository: Repository): Promise<Repository>;
  update(repository: Repository): Promise<Repository>;
  delete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
  search(query: string): Promise<Repository[]>;
  clear(): Promise<void>;
}
