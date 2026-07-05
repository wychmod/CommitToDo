import { Task } from '../../domain/entities/task';
import { ITaskRepository } from '../../domain/repositories/i-task-repository';
import { AppDatabase } from '../db/app-database';
import { TaskModel } from '../models/task-model';

export class DexieTaskRepository implements ITaskRepository {
  constructor(private db: AppDatabase) {}

  async getAll(): Promise<Task[]> {
    const records = await this.db.tasks.where('isDeleted').equals(0).sortBy('sortOrder');
    return records.map(TaskModel.toEntity);
  }

  async getByBranchId(branchId: string): Promise<Task[]> {
    const records = await this.db.tasks
      .where({ branchId, isDeleted: 0 })
      .sortBy('sortOrder');
    return records.map(TaskModel.toEntity);
  }

  async getById(id: string): Promise<Task | null> {
    const record = await this.db.tasks.get(id);
    if (!record || record.isDeleted === 1) return null;
    return TaskModel.toEntity(record);
  }

  async create(task: Task): Promise<Task> {
    const record = TaskModel.toRecord(task);
    await this.db.tasks.add(record);
    return TaskModel.toEntity(record);
  }

  async update(task: Task): Promise<Task> {
    const record = TaskModel.toRecord(task);
    await this.db.tasks.put(record);
    return TaskModel.toEntity(record);
  }

  async delete(id: string): Promise<void> {
    const record = await this.db.tasks.get(id);
    if (!record) return;
    await this.db.tasks.update(id, {
      ...record,
      isDeleted: 1,
      updatedAt: new Date().toISOString(),
    });
  }

  async search(query: string): Promise<Task[]> {
    const lower = query.trim().toLowerCase();
    if (!lower) return this.getAll();
    const records = await this.db.tasks.where('isDeleted').equals(0).toArray();
    return records
      .map(TaskModel.toEntity)
      .filter(
        (task) =>
          task.title.toLowerCase().includes(lower) ||
          (task.description?.toLowerCase().includes(lower) ?? false)
      );
  }

  async searchInRepository(repositoryId: string, query: string): Promise<Task[]> {
    const branches = await this.db.branches
      .where({ repositoryId, isDeleted: 0 })
      .toArray();
    const branchIds = new Set(branches.map((b) => b.id));
    const allTasks = await this.search(query);
    return allTasks.filter((task) => branchIds.has(task.branchId));
  }

  async getCompletedByDateRange(start: Date, end: Date): Promise<Task[]> {
    const records = await this.db.tasks
      .where('isDeleted')
      .equals(0)
      .and((task) => {
        if (!task.completedAt) return false;
        const completed = new Date(task.completedAt);
        return completed >= start && completed <= end;
      })
      .toArray();
    return records.map(TaskModel.toEntity);
  }

  async clear(): Promise<void> {
    await this.db.tasks.clear();
  }
}
