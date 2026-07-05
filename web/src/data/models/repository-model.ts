import { Repository } from '../../domain/entities/repository';

export interface RepositoryRecord {
  id: string;
  name: string;
  icon: string;
  color: string;
  isArchived: number;
  isDeleted: number;
  createdAt: string;
  updatedAt: string;
}

export const RepositoryModel = {
  toRecord(entity: Repository): RepositoryRecord {
    return {
      id: entity.id,
      name: entity.name,
      icon: entity.icon,
      color: entity.color,
      isArchived: entity.isArchived ? 1 : 0,
      isDeleted: entity.isDeleted ? 1 : 0,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  },

  toEntity(record: RepositoryRecord): Repository {
    return new Repository({
      id: record.id,
      name: record.name,
      icon: record.icon,
      color: record.color,
      isArchived: record.isArchived === 1,
      isDeleted: record.isDeleted === 1,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
    });
  },
};
