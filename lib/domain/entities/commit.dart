import 'package:uuid/uuid.dart';

import 'enums.dart';

/// 提交实体
class Commit {
  final String id;
  final String taskId;
  final String branchId;
  final String message;
  final CommitType type;
  final DateTime createdAt;

  const Commit({
    required this.id,
    required this.taskId,
    required this.branchId,
    required this.message,
    required this.type,
    required this.createdAt,
  });

  /// 创建新提交（无 ID）
  factory Commit.create({
    required String taskId,
    required String branchId,
    required String message,
    required CommitType type,
  }) {
    return Commit(
      id: const Uuid().v4(),
      taskId: taskId,
      branchId: branchId,
      message: message,
      type: type,
      createdAt: DateTime.now(),
    );
  }

  /// copyWith 方法
  Commit copyWith({
    String? id,
    String? taskId,
    String? branchId,
    String? message,
    CommitType? type,
    DateTime? createdAt,
  }) {
    return Commit(
      id: id ?? this.id,
      taskId: taskId ?? this.taskId,
      branchId: branchId ?? this.branchId,
      message: message ?? this.message,
      type: type ?? this.type,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  /// 序列化为 JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'taskId': taskId,
      'branchId': branchId,
      'message': message,
      'type': type.value,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Commit &&
          runtimeType == other.runtimeType &&
          id == other.id;

  @override
  int get hashCode => id.hashCode;
}
