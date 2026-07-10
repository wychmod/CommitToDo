import { v4 as uuidv4 } from 'uuid';

export interface RepositoryData {
  id: string;
  name: string;
  description: string | null;
  defaultBranchId: string | null;
  icon: string;
  color: string;
  isArchived: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Repository implements RepositoryData {
  id: string;
  name: string;
  description: string | null;
  defaultBranchId: string | null;
  icon: string;
  color: string;
  isArchived: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: RepositoryData) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.defaultBranchId = data.defaultBranchId;
    this.icon = data.icon;
    this.color = data.color;
    this.isArchived = data.isArchived;
    this.isDeleted = data.isDeleted;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static create(
    name: string,
    icon = 'repository',
    color = '#3B82F6',
    description: string | null = null
  ): Repository {
    const now = new Date();
    return new Repository({
      id: uuidv4(),
      name,
      description,
      defaultBranchId: null,
      icon,
      color,
      isArchived: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  copyWith(updates: Partial<RepositoryData>): Repository {
    return new Repository({
      ...this,
      ...updates,
      updatedAt: new Date(),
    });
  }

  toJson(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      defaultBranchId: this.defaultBranchId,
      icon: this.icon,
      color: this.color,
      isArchived: this.isArchived,
      isDeleted: this.isDeleted,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
