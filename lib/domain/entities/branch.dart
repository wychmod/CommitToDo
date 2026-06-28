import 'package:uuid/uuid.dart';

/// 分支实体
class Branch {
  final String id;
  final String repositoryId;
  final String name;
  final String? parentBranchId;
  final bool isMain;
  final String color;
  final bool isDeleted;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Branch({
    required this.id,
    required this.repositoryId,
    required this.name,
    this.parentBranchId,
    this.isMain = false,
    this.color = '#3B82F6',
    this.isDeleted = false,
    required this.createdAt,
    required this.updatedAt,
  });

  /// 创建新分支（无 ID）
  factory Branch.create({
    required String repositoryId,
    required String name,
    String? parentBranchId,
    bool isMain = false,
    String color = '#3B82F6',
  }) {
    final now = DateTime.now();
    return Branch(
      id: const Uuid().v4(),
      repositoryId: repositoryId,
      name: name,
      parentBranchId: parentBranchId,
      isMain: isMain,
      color: color,
      createdAt: now,
      updatedAt: now,
    );
  }

  /// copyWith 方法
  Branch copyWith({
    String? id,
    String? repositoryId,
    String? name,
    String? parentBranchId,
    bool? isMain,
    String? color,
    bool? isDeleted,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Branch(
      id: id ?? this.id,
      repositoryId: repositoryId ?? this.repositoryId,
      name: name ?? this.name,
      parentBranchId: parentBranchId ?? this.parentBranchId,
      isMain: isMain ?? this.isMain,
      color: color ?? this.color,
      isDeleted: isDeleted ?? this.isDeleted,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  /// 序列化为 JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'repositoryId': repositoryId,
      'name': name,
      'parentBranchId': parentBranchId,
      'isMain': isMain,
      'color': color,
      'isDeleted': isDeleted,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Branch &&
          runtimeType == other.runtimeType &&
          id == other.id;

  @override
  int get hashCode => id.hashCode;
}
