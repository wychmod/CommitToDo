import { Branch } from '../../domain/entities/branch';

export interface BranchRecord {
  id: string;
  repositoryId: string;
  name: string;
  parentBranchId: string | null;
  isMain: number;
  color: string;
  isDeleted: number;
  createdAt: string;
  updatedAt: string;
}

export const BranchModel = {
  toRecord(entity: Branch): BranchRecord {
    return {
      id: entity.id,
      repositoryId: entity.repositoryId,
      name: entity.name,
      parentBranchId: entity.parentBranchId,
      isMain: entity.isMain ? 1 : 0,
      color: entity.color,
      isDeleted: entity.isDeleted ? 1 : 0,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  },

  toEntity(record: BranchRecord): Branch {
    return new Branch({
      id: record.id,
      repositoryId: record.repositoryId,
      name: record.name,
      parentBranchId: record.parentBranchId,
      isMain: record.isMain === 1,
      color: record.color,
      isDeleted: record.isDeleted === 1,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
    });
  },
};
