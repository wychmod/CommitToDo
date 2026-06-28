import 'package:get_it/get_it.dart';

import '../../data/database/app_database.dart';
import '../../data/repositories/local_branch_repository.dart';
import '../../data/repositories/local_commit_repository.dart';
import '../../data/repositories/local_repository_repository.dart';
import '../../data/repositories/local_task_repository.dart';
import '../../domain/repositories/i_branch_repository.dart';
import '../../domain/repositories/i_commit_repository.dart';
import '../../domain/repositories/i_repository_repository.dart';
import '../../domain/repositories/i_task_repository.dart';
import '../../domain/services/data_export_service.dart';
import '../../domain/usecases/branch/create_branch_usecase.dart';
import '../../domain/usecases/branch/delete_branch_usecase.dart';
import '../../domain/usecases/branch/merge_branch_usecase.dart';
import '../../domain/usecases/repository/create_repository_usecase.dart';
import '../../domain/usecases/repository/delete_repository_usecase.dart';
import '../../domain/usecases/repository/update_repository_usecase.dart';
import '../../domain/usecases/task/complete_task_usecase.dart';
import '../../domain/usecases/task/create_task_usecase.dart';
import '../../domain/usecases/task/delete_task_usecase.dart';
import '../../domain/usecases/task/update_task_usecase.dart';

/// 全局 GetIt 实例
final getIt = GetIt.instance;

/// 配置依赖注入
/// 所有 Repository 通过接口注册，Presentation 层只依赖接口
void configureDependencies() {
  // ── Database ──────────────────────────────────────────────
  getIt.registerLazySingleton(() => AppDatabase());

  // ── Repositories (接口 → 实现) ───────────────────────────
  getIt.registerLazySingleton<IRepositoryRepository>(
    () => LocalRepositoryRepository(getIt<AppDatabase>()),
  );
  getIt.registerLazySingleton<IBranchRepository>(
    () => LocalBranchRepository(getIt<AppDatabase>()),
  );
  getIt.registerLazySingleton<ITaskRepository>(
    () => LocalTaskRepository(getIt<AppDatabase>()),
  );
  getIt.registerLazySingleton<ICommitRepository>(
    () => LocalCommitRepository(getIt<AppDatabase>()),
  );

  // ── Domain Services ───────────────────────────────────────
  getIt.registerLazySingleton(
    () => DataExportService(
      getIt<IRepositoryRepository>(),
      getIt<IBranchRepository>(),
      getIt<ITaskRepository>(),
      getIt<ICommitRepository>(),
    ),
  );

  // ── Use Cases — Repository ────────────────────────────────
  getIt.registerFactory(
    () => CreateRepositoryUseCase(getIt<IRepositoryRepository>()),
  );
  getIt.registerFactory(
    () => UpdateRepositoryUseCase(getIt<IRepositoryRepository>()),
  );
  getIt.registerFactory(
    () => DeleteRepositoryUseCase(getIt<IRepositoryRepository>()),
  );

  // ── Use Cases — Branch ────────────────────────────────────
  getIt.registerFactory(
    () => CreateBranchUseCase(getIt<IBranchRepository>()),
  );
  getIt.registerFactory(
    () => MergeBranchUseCase(
      getIt<IBranchRepository>(),
      getIt<ITaskRepository>(),
      getIt<ICommitRepository>(),
    ),
  );
  getIt.registerFactory(
    () => DeleteBranchUseCase(getIt<IBranchRepository>()),
  );

  // ── Use Cases — Task ──────────────────────────────────────
  getIt.registerFactory(
    () => CreateTaskUseCase(
      getIt<ITaskRepository>(),
      getIt<ICommitRepository>(),
    ),
  );
  getIt.registerFactory(
    () => UpdateTaskUseCase(
      getIt<ITaskRepository>(),
      getIt<ICommitRepository>(),
    ),
  );
  getIt.registerFactory(
    () => CompleteTaskUseCase(
      getIt<ITaskRepository>(),
      getIt<ICommitRepository>(),
    ),
  );
  getIt.registerFactory(
    () => DeleteTaskUseCase(
      getIt<ITaskRepository>(),
      getIt<ICommitRepository>(),
    ),
  );
}
