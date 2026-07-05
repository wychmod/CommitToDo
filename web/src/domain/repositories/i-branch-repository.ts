import { Branch } from '../entities/branch';

export interface IBranchRepository {
  getAll(): Promise<Branch[]>;
  getByRepositoryId(repositoryId: string): Promise<Branch[]>;
  getById(id: string): Promise<Branch | null>;
  create(branch: Branch): Promise<Branch>;
  update(branch: Branch): Promise<Branch>;
  delete(id: string): Promise<void>;
  search(query: string): Promise<Branch[]>;
  clear(): Promise<void>;
}
