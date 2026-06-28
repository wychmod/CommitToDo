import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/injection_container.dart';
import '../../../domain/entities/repository.dart';
import '../../../domain/repositories/i_repository_repository.dart';
import '../../../domain/usecases/repository/create_repository_usecase.dart';
import '../../../domain/usecases/repository/delete_repository_usecase.dart';
import 'home_state.dart';

/// 首页 Notifier
class HomeNotifier extends StateNotifier<HomeState> {
  HomeNotifier() : super(const HomeState()) {
    _repositoryRepo = getIt<IRepositoryRepository>();
    _createRepoUseCase = getIt<CreateRepositoryUseCase>();
    _deleteRepoUseCase = getIt<DeleteRepositoryUseCase>();
    loadRepositories();
  }

  late final IRepositoryRepository _repositoryRepo;
  late final CreateRepositoryUseCase _createRepoUseCase;
  late final DeleteRepositoryUseCase _deleteRepoUseCase;

  Future<void> loadRepositories() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final repos = await _repositoryRepo.getAll();
      state = state.copyWith(
        repositories: repos,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<Repository?> createRepository({
    required String name,
    String icon = 'folder',
    String color = '#3B82F6',
  }) async {
    try {
      final repo = await _createRepoUseCase.execute(
        name: name,
        icon: icon,
        color: color,
      );
      await loadRepositories();
      return repo;
    } catch (e) {
      state = state.copyWith(error: e.toString());
      return null;
    }
  }

  Future<void> deleteRepository(String id) async {
    try {
      await _deleteRepoUseCase.execute(id);
      await loadRepositories();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }
}

/// 首页 Notifier Provider
final homeNotifierProvider =
    StateNotifierProvider<HomeNotifier, HomeState>(
  (ref) => HomeNotifier(),
);
