import { v4 as uuidv4 } from 'uuid';
import { Priority, TaskStatus } from './enums';

export interface TaskData {
  id: string;
  branchId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: Date | null;
  completedAt: Date | null;
  parentTaskId: string | null;
  sortOrder: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Task implements TaskData {
  id: string;
  branchId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: Date | null;
  completedAt: Date | null;
  parentTaskId: string | null;
  sortOrder: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: TaskData) {
    this.id = data.id;
    this.branchId = data.branchId;
    this.title = data.title;
    this.description = data.description;
    this.status = data.status;
    this.priority = data.priority;
    this.dueDate = data.dueDate;
    this.completedAt = data.completedAt;
    this.parentTaskId = data.parentTaskId;
    this.sortOrder = data.sortOrder;
    this.isDeleted = data.isDeleted;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static create(
    branchId: string,
    title: string,
    options?: {
      description?: string | null;
      priority?: Priority;
      dueDate?: Date | null;
      parentTaskId?: string | null;
      sortOrder?: number;
    }
  ): Task {
    const now = new Date();
    return new Task({
      id: uuidv4(),
      branchId,
      title,
      description: options?.description ?? null,
      status: TaskStatus.todo,
      priority: options?.priority ?? Priority.medium,
      dueDate: options?.dueDate ?? null,
      completedAt: null,
      parentTaskId: options?.parentTaskId ?? null,
      sortOrder: options?.sortOrder ?? 0,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  copyWith(updates: Partial<TaskData>): Task {
    return new Task({
      ...this,
      ...updates,
      updatedAt: new Date(),
    });
  }

  toJson(): Record<string, unknown> {
    return {
      id: this.id,
      branchId: this.branchId,
      title: this.title,
      description: this.description,
      status: this.status,
      priority: this.priority,
      dueDate: this.dueDate?.toISOString() ?? null,
      completedAt: this.completedAt?.toISOString() ?? null,
      parentTaskId: this.parentTaskId,
      sortOrder: this.sortOrder,
      isDeleted: this.isDeleted,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  get isCompleted(): boolean {
    return this.status === TaskStatus.done || this.status === TaskStatus.cancelled;
  }

  get isOverdue(): boolean {
    if (!this.dueDate || this.isCompleted) return false;
    return new Date() > this.dueDate;
  }
}
