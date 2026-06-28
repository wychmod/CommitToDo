import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/entities/task.dart';
import 'task_providers.dart';

/// 搜索查询 Provider
final searchQueryProvider = StateProvider<String>((ref) => '');

/// 搜索结果 Provider
final searchResultsProvider =
    FutureProvider<List<Task>>((ref) async {
  final query = ref.watch(searchQueryProvider);
  if (query.trim().isEmpty) return [];

  final repo = ref.read(taskRepositoryProvider);
  return await repo.search(query);
});

/// 搜索历史 Provider
final searchHistoryProvider =
    StateProvider<List<String>>((ref) => []);
