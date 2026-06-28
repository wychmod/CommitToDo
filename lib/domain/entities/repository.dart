import 'package:uuid/uuid.dart';

/// 仓库实体
class Repository {
  final String id;
  final String name;
  final String icon;
  final String color;
  final bool isArchived;
  final bool isDeleted;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Repository({
    required this.id,
    required this.name,
    this.icon = 'folder',
    this.color = '#3B82F6',
    this.isArchived = false,
    this.isDeleted = false,
    required this.createdAt,
    required this.updatedAt,
  });

  /// 创建新仓库（无 ID）
  factory Repository.create({
    required String name,
    String icon = 'folder',
    String color = '#3B82F6',
  }) {
    final now = DateTime.now();
    return Repository(
      id: const Uuid().v4(),
      name: name,
      icon: icon,
      color: color,
      createdAt: now,
      updatedAt: now,
    );
  }

  /// copyWith 方法
  Repository copyWith({
    String? id,
    String? name,
    String? icon,
    String? color,
    bool? isArchived,
    bool? isDeleted,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Repository(
      id: id ?? this.id,
      name: name ?? this.name,
      icon: icon ?? this.icon,
      color: color ?? this.color,
      isArchived: isArchived ?? this.isArchived,
      isDeleted: isDeleted ?? this.isDeleted,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  /// 序列化为 JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'icon': icon,
      'color': color,
      'isArchived': isArchived,
      'isDeleted': isDeleted,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Repository &&
          runtimeType == other.runtimeType &&
          id == other.id;

  @override
  int get hashCode => id.hashCode;
}
