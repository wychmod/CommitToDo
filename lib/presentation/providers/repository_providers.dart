import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/di/injection_container.dart';
import '../../domain/entities/branch.dart';
import '../../domain/entities/repository.dart';
import '../../domain/repositories/i_branch_repository.dart';
import '../../domain/repositories/i_repository_repository.dart';
import '../screens/repository/repository_notifier.dart';
import '../screens/repository/repository_state.dart';

/// 仓库仓储 Provider
final repositoryRepositoryProvider =
    Provider<IRepositoryRepository>((ref) {
  return getIt<IRepositoryRepository>();
});

/// 分支仓储 Provider
final branchRepositoryProvider =
    Provider<IBranchRepository>((ref) {
  return getIt<IBranchRepository>();
});

/// 所有仓库列表 Provider
final repositoriesProvider =
    FutureProvider<List<Repository>>((ref) async {
  final repo = ref.read(repositoryRepositoryProvider);
  return await repo.getAll();
});

/// 仓库详情 Provider（根据 ID）
final repositoryDetailProvider =
    FutureProvider.family<Repository?, String>(
  (ref, id) async {
    final repo = ref.read(repositoryRepositoryProvider);
    return await repo.getById(id);
  },
);

/// 仓库的分支列表 Provider
final repositoryBranchesProvider =
    FutureProvider.family<List<Branch>, String>(
  (ref, repositoryId) async {
    final repo = ref.read(branchRepositoryProvider);
    return await repo.getByRepositoryId(repositoryId);
  },
);

/// 仓库详情页 Notifier Provider（统一入口，供详情页与任务表单刷新）
final repositoryNotifierProvider = StateNotifierProvider
    .family<RepositoryNotifier, RepositoryScreenState, String>(
  (ref, repositoryId) => RepositoryNotifier(repositoryId),
);
