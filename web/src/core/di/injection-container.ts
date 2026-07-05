import 'reflect-metadata';
import { container } from 'tsyringe';

import { AppDatabase, appDatabase } from '../../data/db/app-database';
import { DexieBranchRepository } from '../../data/repositories/dexie-branch-repository';
import { DexieCommitRepository } from '../../data/repositories/dexie-commit-repository';
import { DexieRepositoryRepository } from '../../data/repositories/dexie-repository-repository';
import { DexieTaskRepository } from '../../data/repositories/dexie-task-repository';

import { IBranchRepository } from '../../domain/repositories/i-branch-repository';
import { ICommitRepository } from '../../domain/repositories/i-commit-repository';
import { IRepositoryRepository } from '../../domain/repositories/i-repository-repository';
import { ITaskRepository } from '../../domain/repositories/i-task-repository';
import { DataExportService } from '../../domain/services/data-export-service';

import { CreateBranchUseCase } from '../../application/usecases/branch/create-branch-usecase';
import { DeleteBranchUseCase } from '../../application/usecases/branch/delete-branch-usecase';
import { MergeBranchUseCase } from '../../application/usecases/branch/merge-branch-usecase';
import { CreateRepositoryUseCase } from '../../application/usecases/repository/create-repository-usecase';
import { DeleteRepositoryUseCase } from '../../application/usecases/repository/delete-repository-usecase';
import { UpdateRepositoryUseCase } from '../../application/usecases/repository/update-repository-usecase';
import { CompleteTaskUseCase } from '../../application/usecases/task/complete-task-usecase';
import { CreateTaskUseCase } from '../../application/usecases/task/create-task-usecase';
import { DeleteTaskUseCase } from '../../application/usecases/task/delete-task-usecase';
import { UpdateTaskUseCase } from '../../application/usecases/task/update-task-usecase';
import { ImportDataUseCase } from '../../application/usecases/import-data-usecase';

import { WebFileSaveService } from '../../platform/web-file-save-service';
import { WebNotificationService } from '../../platform/web-notification-service';

container.registerInstance(AppDatabase, appDatabase);

container.register<IRepositoryRepository>('IRepositoryRepository', {
  useFactory: () => new DexieRepositoryRepository(container.resolve(AppDatabase)),
});

container.register<IBranchRepository>('IBranchRepository', {
  useFactory: () => new DexieBranchRepository(container.resolve(AppDatabase)),
});

container.register<ITaskRepository>('ITaskRepository', {
  useFactory: () => new DexieTaskRepository(container.resolve(AppDatabase)),
});

container.register<ICommitRepository>('ICommitRepository', {
  useFactory: () => new DexieCommitRepository(container.resolve(AppDatabase)),
});

container.register(DataExportService, {
  useFactory: () =>
    new DataExportService(
      container.resolve<IRepositoryRepository>('IRepositoryRepository'),
      container.resolve<IBranchRepository>('IBranchRepository'),
      container.resolve<ITaskRepository>('ITaskRepository'),
      container.resolve<ICommitRepository>('ICommitRepository')
    ),
});

container.register(CreateRepositoryUseCase, {
  useFactory: () =>
    new CreateRepositoryUseCase(
      container.resolve<IRepositoryRepository>('IRepositoryRepository'),
      container.resolve<IBranchRepository>('IBranchRepository')
    ),
});

container.register(UpdateRepositoryUseCase, {
  useFactory: () =>
    new UpdateRepositoryUseCase(
      container.resolve<IRepositoryRepository>('IRepositoryRepository')
    ),
});

container.register(DeleteRepositoryUseCase, {
  useFactory: () =>
    new DeleteRepositoryUseCase(
      container.resolve<IRepositoryRepository>('IRepositoryRepository'),
      container.resolve<IBranchRepository>('IBranchRepository'),
      container.resolve<ITaskRepository>('ITaskRepository')
    ),
});

container.register(CreateBranchUseCase, {
  useFactory: () =>
    new CreateBranchUseCase(
      container.resolve<IBranchRepository>('IBranchRepository')
    ),
});

container.register(MergeBranchUseCase, {
  useFactory: () =>
    new MergeBranchUseCase(
      container.resolve<IBranchRepository>('IBranchRepository'),
      container.resolve<ITaskRepository>('ITaskRepository'),
      container.resolve<ICommitRepository>('ICommitRepository')
    ),
});

container.register(DeleteBranchUseCase, {
  useFactory: () =>
    new DeleteBranchUseCase(
      container.resolve<IBranchRepository>('IBranchRepository')
    ),
});

container.register(CreateTaskUseCase, {
  useFactory: () =>
    new CreateTaskUseCase(
      container.resolve<ITaskRepository>('ITaskRepository'),
      container.resolve<ICommitRepository>('ICommitRepository')
    ),
});

container.register(UpdateTaskUseCase, {
  useFactory: () =>
    new UpdateTaskUseCase(
      container.resolve<ITaskRepository>('ITaskRepository'),
      container.resolve<ICommitRepository>('ICommitRepository')
    ),
});

container.register(CompleteTaskUseCase, {
  useFactory: () =>
    new CompleteTaskUseCase(
      container.resolve<ITaskRepository>('ITaskRepository'),
      container.resolve<ICommitRepository>('ICommitRepository')
    ),
});

container.register(DeleteTaskUseCase, {
  useFactory: () =>
    new DeleteTaskUseCase(
      container.resolve<ITaskRepository>('ITaskRepository'),
      container.resolve<ICommitRepository>('ICommitRepository')
    ),
});

container.register(ImportDataUseCase, {
  useFactory: () =>
    new ImportDataUseCase(
      container.resolve<IRepositoryRepository>('IRepositoryRepository'),
      container.resolve<IBranchRepository>('IBranchRepository'),
      container.resolve<ITaskRepository>('ITaskRepository'),
      container.resolve<ICommitRepository>('ICommitRepository')
    ),
});

container.registerInstance(WebFileSaveService, new WebFileSaveService());
container.registerInstance(WebNotificationService, new WebNotificationService());

export { container };
