import '../../../domain/entities/repository.dart';

/// 首页状态
class HomeState {
  const HomeState({
    this.repositories = const [],
    this.isLoading = false,
    this.error,
  });

  final List<Repository> repositories;
  final bool isLoading;
  final String? error;

  HomeState copyWith({
    List<Repository>? repositories,
    bool? isLoading,
    String? error,
  }) {
    return HomeState(
      repositories: repositories ?? this.repositories,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}
