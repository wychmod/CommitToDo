import 'package:flutter_test/flutter_test.dart';
import 'package:commit/domain/entities/enums.dart';
import 'package:commit/domain/entities/task.dart';

void main() {
  group('Heatmap completed task grouping', () {
    test('counts only done tasks with completedAt by calendar date', () {
      final tasks = [
        sampleTask(
          id: 'done-1',
          status: TaskStatus.done,
          completedAt: DateTime(2026, 5, 28, 9),
        ),
        sampleTask(
          id: 'done-2',
          status: TaskStatus.done,
          completedAt: DateTime(2026, 5, 28, 18),
        ),
        sampleTask(
          id: 'todo-with-date',
          status: TaskStatus.todo,
          completedAt: DateTime(2026, 5, 28, 12),
        ),
        sampleTask(
          id: 'done-without-date',
          status: TaskStatus.done,
        ),
      ];

      final result = groupCompletedTasksByDate(tasks);

      expect(result, hasLength(1));
      expect(result[DateTime(2026, 5, 28)], 2);
      expect(result.containsKey(DateTime(2026, 5, 29)), isFalse);
    });
  });
}

Map<DateTime, int> groupCompletedTasksByDate(List<Task> tasks) {
  final result = <DateTime, int>{};
  for (final task in tasks) {
    if (task.status != TaskStatus.done || task.completedAt == null) {
      continue;
    }

    final completedAt = task.completedAt!;
    final date = DateTime(
      completedAt.year,
      completedAt.month,
      completedAt.day,
    );
    result[date] = (result[date] ?? 0) + 1;
  }
  return result;
}

Task sampleTask({
  required String id,
  required TaskStatus status,
  DateTime? completedAt,
}) {
  final now = DateTime(2026, 5, 28, 10);
  return Task(
    id: id,
    branchId: 'branch-1',
    title: id,
    status: status,
    completedAt: completedAt,
    createdAt: now,
    updatedAt: now,
  );
}
