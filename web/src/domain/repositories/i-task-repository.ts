import { Task } from '../entities/task';

export interface ITaskRepository {
  getAll(): Promise<Task[]>;
  getByBranchId(branchId: string): Promise<Task[]>;
  getById(id: string): Promise<Task | null>;
  create(task: Task): Promise<Task>;
  update(task: Task): Promise<Task>;
  delete(id: string): Promise<void>;
  search(query: string): Promise<Task[]>;
  searchInRepository(repositoryId: string, query: string): Promise<Task[]>;
  getCompletedByDateRange(start: Date, end: Date): Promise<Task[]>;
  clear(): Promise<void>;
}
