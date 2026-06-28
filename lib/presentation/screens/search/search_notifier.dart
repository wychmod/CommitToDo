import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/di/injection_container.dart';
import '../../../domain/entities/task.dart';
import '../../../domain/repositories/i_task_repository.dart';

/// 搜索状态
class SearchState {
  const SearchState({
    this.query = '',
    this.results = const [],
    this.history = const [],
    this.isLoading = false,
    this.error,
  });

  final String query;
  final List<Task> results;
  final List<String> history;
  final bool isLoading;
  final String? error;

  SearchState copyWith({
    String? query,
    List<Task>? results,
    List<String>? history,
    bool? isLoading,
    String? error,
  }) {
    return SearchState(
      query: query ?? this.query,
      results: results ?? this.results,
      history: history ?? this.history,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

/// 搜索 Notifier
class SearchNotifier extends StateNotifier<SearchState> {
  SearchNotifier() : super(const SearchState()) {
    _taskRepo = getIt<ITaskRepository>();
    _loadHistory();
  }

  static const _historyKey = 'searchHistory';
  late final ITaskRepository _taskRepo;
  SharedPreferences? _prefs;

  Future<void> _loadHistory() async {
    _prefs = await SharedPreferences.getInstance();
    state = state.copyWith(
      history: _prefs?.getStringList(_historyKey) ?? const [],
    );
  }

  Future<void> search(String query) async {
    if (query.trim().isEmpty) {
      state = state.copyWith(
        query: '',
        results: [],
        isLoading: false,
      );
      return;
    }

    state = state.copyWith(
      query: query,
      isLoading: true,
      error: null,
    );

    try {
      final results = await _taskRepo.search(query);

      // 更新并持久化搜索历史
      final normalizedQuery = query.trim();
      final history = List<String>.from(state.history)
        ..removeWhere((item) => item == normalizedQuery)
        ..insert(0, normalizedQuery);
      if (history.length > 10) {
        history.removeRange(10, history.length);
      }
      await _prefs?.setStringList(_historyKey, history);

      state = state.copyWith(
        results: results,
        history: history,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  void clearResults() {
    state = state.copyWith(
      query: '',
      results: [],
    );
  }

  Future<void> clearHistory() async {
    await _prefs?.remove(_historyKey);
    state = state.copyWith(history: []);
  }
}

/// 搜索 Notifier Provider
final searchNotifierProvider =
    StateNotifierProvider<SearchNotifier, SearchState>(
  (ref) => SearchNotifier(),
);
