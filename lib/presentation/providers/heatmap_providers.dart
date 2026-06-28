import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/di/injection_container.dart';
import '../../domain/repositories/i_task_repository.dart';

/// 热力图数据 Provider
/// 返回 {日期 -> 完成任务数}
final heatmapDataProvider =
    FutureProvider<Map<DateTime, int>>((ref) async {
  final repo = getIt<ITaskRepository>();

  // 获取过去一年的数据
  final endDate = DateTime.now();
  final startDate = endDate.subtract(
    const Duration(days: 365),
  );

  final tasks = await repo.getCompletedByDateRange(
    startDate,
    endDate,
  );

  // 按日期分组统计
  final Map<DateTime, int> result = {};
  for (final task in tasks) {
    if (task.completedAt != null) {
      final date = DateTime(
        task.completedAt!.year,
        task.completedAt!.month,
        task.completedAt!.day,
      );
      result[date] = (result[date] ?? 0) + 1;
    }
  }

  return result;
});
