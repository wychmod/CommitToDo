import { v4 as uuidv4 } from 'uuid';

export interface BranchData {
  id: string;
  repositoryId: string;
  name: string;
  parentBranchId: string | null;
  isMain: boolean;
  color: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Branch implements BranchData {
  id: string;
  repositoryId: string;
  name: string;
  parentBranchId: string | null;
  isMain: boolean;
  color: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: BranchData) {
    this.id = data.id;
    this.repositoryId = data.repositoryId;
    this.name = data.name;
    this.parentBranchId = data.parentBranchId;
    this.isMain = data.isMain;
    this.color = data.color;
    this.isDeleted = data.isDeleted;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static create(
    repositoryId: string,
    name: string,
    options?: { isMain?: boolean; parentBranchId?: string | null; color?: string }
  ): Branch {
    const now = new Date();
    return new Branch({
      id: uuidv4(),
      repositoryId,
      name,
      parentBranchId: options?.parentBranchId ?? null,
      isMain: options?.isMain ?? false,
      color: options?.color ?? '#3B82F6',
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  static main(repositoryId: string, color = '#3B82F6'): Branch {
    return Branch.create(repositoryId, 'main', { isMain: true, color });
  }

  copyWith(updates: Partial<BranchData>): Branch {
    return new Branch({
      ...this,
      ...updates,
      updatedAt: new Date(),
    });
  }

  toJson(): Record<string, unknown> {
    return {
      id: this.id,
      repositoryId: this.repositoryId,
      name: this.name,
      parentBranchId: this.parentBranchId,
      isMain: this.isMain,
      color: this.color,
      isDeleted: this.isDeleted,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
