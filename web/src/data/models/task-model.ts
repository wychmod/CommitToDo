import { Priority, TaskStatus } from '../../domain/entities/enums';
import { Task } from '../../domain/entities/task';

export interface TaskRecord {
  id: string;
  branchId: string;
  title: string;
  description: string | null;
  status: number;
  priority: number;
  dueDate: string | null;
  completedAt: string | null;
  parentTaskId: string | null;
  sortOrder: number;
  isDeleted: number;
  createdAt: string;
  updatedAt: string;
}

export const TaskModel = {
  toRecord(entity: Task): TaskRecord {
    return {
      id: entity.id,
      branchId: entity.branchId,
      title: entity.title,
      description: entity.description,
      status: entity.status,
      priority: entity.priority,
      dueDate: entity.dueDate?.toISOString() ?? null,
      completedAt: entity.completedAt?.toISOString() ?? null,
      parentTaskId: entity.parentTaskId,
      sortOrder: entity.sortOrder,
      isDeleted: entity.isDeleted ? 1 : 0,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  },

  toEntity(record: TaskRecord): Task {
    return new Task({
      id: record.id,
      branchId: record.branchId,
      title: record.title,
      description: record.description,
      status: TaskStatus.fromValue(record.status),
      priority: Priority.fromValue(record.priority),
      dueDate: record.dueDate ? new Date(record.dueDate) : null,
      completedAt: record.completedAt ? new Date(record.completedAt) : null,
      parentTaskId: record.parentTaskId,
      sortOrder: record.sortOrder,
      isDeleted: record.isDeleted === 1,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
    });
  },
};
