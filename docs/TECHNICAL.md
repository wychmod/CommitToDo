# Commit - 技术设计文档

**版本**: 1.0.0  
**更新日期**: 2026-05-28  
**技术栈**: Flutter 3.x + Dart  
**架构模式**: Clean Architecture + Repository Pattern

---

## 📌 技术概述

### 技术选型

| 类别 | 选择 | 理由 |
|------|------|------|
| **框架** | Flutter 3.x | 一套代码覆盖 6 平台，开发效率最高 |
| **语言** | Dart | Flutter 原生语言，类型安全 |
| **状态管理** | Riverpod 2.x | 轻量、类型安全、代码量少 |
| **数据库** | drift (SQLite ORM) | 类型安全、自动迁移、减少手写 SQL |
| **路由** | go_router | 官方推荐，支持深链接 |
| **DI** | get_it | 轻量，适合单人开发 |
| **HTTP** | dio | 功能全，拦截器好用 |
| **本地通知** | flutter_local_notifications | 唯一选择，覆盖全平台 |

### 依赖清单

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # 状态管理
  flutter_riverpod: ^2.5.0
  riverpod_annotation: ^2.3.0
  
  # 数据库
  drift: ^2.15.0
  sqlite3_flutter_libs: ^0.5.0
  
  # 路由
  go_router: ^14.0.0
  
  # DI
  get_it: ^8.0.0
  injectable: ^2.4.0
  
  # 网络（后期扩展用）
  dio: ^5.4.0
  
  # 本地通知
  flutter_local_notifications: ^17.0.0
  
  # 文件操作
  path_provider: ^2.1.0
  file_picker: ^8.0.0
  
  # 工具
  uuid: ^4.0.0
  intl: ^0.19.0
  collection: ^1.18.0
  
  # UI 组件
  flutter_svg: ^2.0.0
  cached_network_image: ^3.3.0
  
  # 系统功能
  shared_preferences: ^2.2.0
  url_launcher: ^6.2.0
  
  # 桌面端支持
  window_manager: ^0.4.0
  system_tray: ^2.0.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  
  # 代码生成
  build_runner: ^2.4.0
  riverpod_generator: ^2.4.0
  drift_dev: ^2.15.0
  injectable_generator: ^2.6.0
  
  # 代码规范
  flutter_lints: ^4.0.0
  very_good_analysis: ^5.1.0
```

---

## 🏗️ 架构设计

### 分层架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Screens / Widgets                                      ││
│  │  - 不关心数据从哪来，只消费 Provider/State               ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│                    Application Layer                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Use Cases / Services                                   ││
│  │  - 业务逻辑编排                                         ││
│  │  - 调用 Repository 接口                                 ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│                    Domain Layer (核心)                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Entities / Value Objects                               ││
│  │  - Task, Branch, Repository, Tag                        ││
│  │  - 纯 Dart，无任何依赖                                   ││
│  ├─────────────────────────────────────────────────────────┤│
│  │  Repository Interfaces (抽象)                           ││
│  │  - ITaskRepository, IBranchRepository                   ││
│  │  - 定义契约，不关心实现                                   ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│                    Data Layer (可插拔)                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────┐│
│  │  Local Data      │  │  Remote Data     │  │  Sync      ││
│  │  Source           │  │  Source           │  │  Engine    ││
│  │  - drift (SQLite) │  │  - REST API      │  │  - 冲突检测 ││
│  │  - 本地文件       │  │  - GraphQL       │  │  - 合并策略 ││
│  └──────────────────┘  └──────────────────┘  └────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 项目结构

```
lib/
├── main.dart                    # 入口
├── app.dart                     # MaterialApp 配置
│
├── core/                        # 核心工具层
│   ├── constants/
│   │   ├── app_constants.dart   # 应用常量
│   │   ├── db_constants.dart    # 数据库常量
│   │   └── api_constants.dart   # API 常量
│   ├── extensions/
│   │   ├── date_extensions.dart
│   │   ├── string_extensions.dart
│   │   └── list_extensions.dart
│   ├── theme/
│   │   ├── app_theme.dart       # 主题配置
│   │   ├── colors.dart          # 颜色定义
│   │   ├── typography.dart      # 字体定义
│   │   └── dimensions.dart      # 尺寸定义
│   ├── utils/
│   │   ├── logger.dart          # 日志工具
│   │   ├── validators.dart      # 验证器
│   │   └── formatters.dart      # 格式化工具
│   └── di/
│       └── injection_container.dart  # DI 配置
│
├── data/                        # 数据层
│   ├── database/
│   │   ├── app_database.dart    # 数据库定义
│   │   ├── tables/
│   │   │   ├── repositories_table.dart
│   │   │   ├── branches_table.dart
│   │   │   ├── tasks_table.dart
│   │   │   ├── commits_table.dart
│   │   │   └── tags_table.dart
│   │   └── daos/
│   │       ├── repository_dao.dart
│   │       ├── branch_dao.dart
│   │       ├── task_dao.dart
│   │       └── commit_dao.dart
│   ├── models/
│   │   ├── repository_model.dart
│   │   ├── branch_model.dart
│   │   ├── task_model.dart
│   │   └── commit_model.dart
│   └── repositories/
│       ├── local_task_repository.dart
│       ├── local_branch_repository.dart
│       └── local_repository_repository.dart
│
├── domain/                      # 领域层
│   ├── entities/
│   │   ├── repository.dart
│   │   ├── branch.dart
│   │   ├── task.dart
│   │   ├── commit.dart
│   │   └── enums.dart
│   ├── repositories/
│   │   ├── i_task_repository.dart
│   │   ├── i_branch_repository.dart
│   │   └── i_repository_repository.dart
│   └── usecases/
│       ├── task/
│       │   ├── create_task_usecase.dart
│       │   ├── update_task_usecase.dart
│       │   ├── complete_task_usecase.dart
│       │   └── delete_task_usecase.dart
│       ├── branch/
│       │   ├── create_branch_usecase.dart
│       │   ├── merge_branch_usecase.dart
│       │   └── delete_branch_usecase.dart
│       └── repository/
│           ├── create_repository_usecase.dart
│           └── delete_repository_usecase.dart
│
├── presentation/                # 表现层
│   ├── screens/
│   │   ├── home/
│   │   │   ├── home_screen.dart
│   │   │   ├── home_state.dart
│   │   │   └── home_notifier.dart
│   │   ├── repository/
│   │   │   ├── repository_screen.dart
│   │   │   ├── repository_state.dart
│   │   │   └── repository_notifier.dart
│   │   ├── task/
│   │   │   ├── task_detail_screen.dart
│   │   │   ├── task_form_screen.dart
│   │   │   └── task_notifier.dart
│   │   ├── graph/
│   │   │   ├── git_graph_screen.dart
│   │   │   └── graph_painter.dart
│   │   ├── heatmap/
│   │   │   ├── heatmap_screen.dart
│   │   │   └── heatmap_painter.dart
│   │   ├── search/
│   │   │   └── search_screen.dart
│   │   └── settings/
│   │       └── settings_screen.dart
│   ├── widgets/
│   │   ├── common/
│   │   │   ├── app_bar_widget.dart
│   │   │   ├── bottom_nav_widget.dart
│   │   │   ├── loading_widget.dart
│   │   │   └── error_widget.dart
│   │   ├── task/
│   │   │   ├── task_card.dart
│   │   │   ├── task_list.dart
│   │   │   └── task_form.dart
│   │   ├── branch/
│   │   │   ├── branch_indicator.dart
│   │   │   └── branch_list.dart
│   │   ├── repository/
│   │   │   ├── repository_card.dart
│   │   │   └── repository_list.dart
│   │   └── heatmap/
│   │       ├── heatmap_calendar.dart
│   │       └── heatmap_cell.dart
│   └── providers/
│       ├── task_providers.dart
│       ├── branch_providers.dart
│       ├── repository_providers.dart
│       └── settings_providers.dart
│
└── platform/                    # 平台特定代码
    ├── android/
    │   └── app/src/main/AndroidManifest.xml
    ├── ios/
    │   └── Runner/Info.plist
    ├── windows/
    │   └── runner/main.cpp
    └── macos/
        └── Runner/MainFlutterWindow.swift
```

---

## 🗄️ 数据库设计

### 表结构定义 (drift)

```dart
// repositories_table.dart
@DataClassName('RepositoryData')
class Repositories extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  TextColumn get icon => text().nullable()();
  TextColumn get color => text().nullable()();
  BoolColumn get isArchived => boolean().withDefault(const Constant(false))();
  BoolColumn get isDeleted => boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();
  
  @override
  Set<Column> get primaryKey => {id};
}

// branches_table.dart
@DataClassName('BranchData')
class Branches extends Table {
  TextColumn get id => text()();
  TextColumn get repositoryId => text().references(Repositories, #id)();
  TextColumn get name => text()();
  TextColumn get parentBranchId => text().nullable()();
  BoolColumn get isMain => boolean().withDefault(const Constant(false))();
  TextColumn get color => text().nullable()();
  BoolColumn get isDeleted => boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();
  
  @override
  Set<Column> get primaryKey => {id};
}

// tasks_table.dart
@DataClassName('TaskData')
class Tasks extends Table {
  TextColumn get id => text()();
  TextColumn get branchId => text().references(Branches, #id)();
  TextColumn get title => text()();
  TextColumn get description => text().nullable()();
  IntColumn get status => intEnum<TaskStatus>()();
  IntColumn get priority => intEnum<Priority>()();
  DateTimeColumn get dueDate => dateTime().nullable()();
  DateTimeColumn get completedAt => dateTime().nullable()();
  TextColumn get parentTaskId => text().nullable()();
  IntColumn get sortOrder => integer().withDefault(const Constant(0))();
  BoolColumn get isDeleted => boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();
  
  @override
  Set<Column> get primaryKey => {id};
}

// commits_table.dart
@DataClassName('CommitData')
class Commits extends Table {
  TextColumn get id => text()();
  TextColumn get taskId => text().references(Tasks, #id)();
  TextColumn get branchId => text().references(Branches, #id)();
  TextColumn get message => text()();
  IntColumn get type => intEnum<CommitType>()();
  DateTimeColumn get createdAt => dateTime()();
  
  @override
  Set<Column> get primaryKey => {id};
}

// tags_table.dart
@DataClassName('TagData')
class Tags extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  TextColumn get color => text()();
  DateTimeColumn get createdAt => dateTime()();
  
  @override
  Set<Column> get primaryKey => {id};
}

// task_tags_table.dart
@DataClassName('TaskTagData')
class TaskTags extends Table {
  TextColumn get taskId => text().references(Tasks, #id)();
  TextColumn get tagId => text().references(Tags, #id)();
  
  @override
  Set<Column> get primaryKey => {taskId, tagId};
}
```

### 枚举定义

```dart
// enums.dart
enum TaskStatus {
  todo(0, '待办'),
  inProgress(1, '进行中'),
  done(2, '已完成'),
  cancelled(3, '已取消');
  
  final int value;
  final String label;
  const TaskStatus(this.value, this.label);
}

enum Priority {
  low(0, '低', '🟢'),
  medium(1, '中', '🟡'),
  high(2, '高', '🔴');
  
  final int value;
  final String label;
  final String emoji;
  const Priority(this.value, this.label, this.emoji);
}

enum CommitType {
  create(0, '创建'),
  update(1, '更新'),
  merge(2, '合并'),
  complete(3, '完成'),
  delete(4, '删除');
  
  final int value;
  final String label;
  const CommitType(this.value, this.label);
}
```

---

## 🔧 核心功能技术实现

### 1. 仓库管理

#### Repository 模式

```dart
// i_repository_repository.dart
abstract class IRepositoryRepository {
  Future<List<Repository>> getAll();
  Future<Repository?> getById(String id);
  Future<Repository> create(Repository repository);
  Future<Repository> update(Repository repository);
  Future<void> delete(String id);
  Future<void> restore(String id);
}

// local_repository_repository.dart
class LocalRepositoryRepository implements IRepositoryRepository {
  final AppDatabase _db;
  
  LocalRepositoryRepository(this._db);
  
  @override
  Future<List<Repository>> getAll() async {
    final data = await _db.repositoryDao.getAll();
    return data.map((d) => d.toEntity()).toList();
  }
  
  @override
  Future<Repository> create(Repository repository) async {
    final id = const Uuid().v4();
    final now = DateTime.now();
    
    await _db.repositoryDao.insert(RepositoryData(
      id: id,
      name: repository.name,
      icon: repository.icon,
      color: repository.color,
      isArchived: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    ));
    
    // 自动创建 main 分支
    await _db.branchDao.insert(BranchData(
      id: const Uuid().v4(),
      repositoryId: id,
      name: 'main',
      isMain: true,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    ));
    
    return repository.copyWith(id: id);
  }
}
```

#### Use Case

```dart
// create_repository_usecase.dart
@injectable
class CreateRepositoryUseCase {
  final IRepositoryRepository _repository;
  
  CreateRepositoryUseCase(this._repository);
  
  Future<Repository> execute({
    required String name,
    String? icon,
    String? color,
  }) async {
    final repository = Repository(
      name: name,
      icon: icon ?? '📁',
      color: color ?? '#4A90D9',
    );
    
    return await _repository.create(repository);
  }
}
```

### 2. 分支管理

#### 分支合并算法

```dart
// merge_branch_usecase.dart
@injectable
class MergeBranchUseCase {
  final IBranchRepository _branchRepository;
  final ITaskRepository _taskRepository;
  final ICommitRepository _commitRepository;
  
  MergeBranchUseCase(
    this._branchRepository,
    this._taskRepository,
    this._commitRepository,
  );
  
  Future<void> execute({
    required String sourceBranchId,
    required String targetBranchId,
  }) async {
    // 1. 获取源分支的所有任务
    final tasks = await _taskRepository.getByBranchId(sourceBranchId);
    
    // 2. 将未完成的任务移动到目标分支
    for (final task in tasks) {
      if (task.status != TaskStatus.done) {
        await _taskRepository.update(task.copyWith(
          branchId: targetBranchId,
        ));
        
        // 记录合并提交
        await _commitRepository.create(Commit(
          taskId: task.id,
          branchId: targetBranchId,
          message: '合并自分支: ${sourceBranchId}',
          type: CommitType.merge,
        ));
      }
    }
    
    // 3. 删除源分支（软删除）
    await _branchRepository.delete(sourceBranchId);
  }
}
```

### 3. 任务管理

#### 任务状态机

```dart
// task_state_machine.dart
class TaskStateMachine {
  static bool canTransition(TaskStatus from, TaskStatus to) {
    return switch (from) {
      TaskStatus.todo => [
        TaskStatus.inProgress,
        TaskStatus.done,
        TaskStatus.cancelled,
      ].contains(to),
      
      TaskStatus.inProgress => [
        TaskStatus.todo,
        TaskStatus.done,
        TaskStatus.cancelled,
      ].contains(to),
      
      TaskStatus.done => [
        TaskStatus.todo,
      ].contains(to),
      
      TaskStatus.cancelled => [
        TaskStatus.todo,
      ].contains(to),
    };
  }
  
  static TaskStatus transition(TaskStatus from, TaskStatus to) {
    if (!canTransition(from, to)) {
      throw StateError('Invalid transition: $from -> $to');
    }
    return to;
  }
}
```

### 4. 搜索功能

#### 全文搜索实现

```dart
// task_dao.dart
@DriftAccessor(tables: [Tasks, Branches, Repositories])
class TaskDao extends DatabaseAccessor<AppDatabase> with _$TaskDaoMixin {
  TaskDao(AppDatabase db) : super(db);
  
  /// 全局搜索任务
  Future<List<TaskData>> search(String query) async {
    final lowercaseQuery = '%${query.toLowerCase()}%';
    
    return await (select(tasks)
      ..where((t) => 
        t.title.like(lowercaseQuery) | 
        t.description.like(lowercaseQuery)
      )
      ..orderBy([
        (t) => OrderingTerm.desc(t.updatedAt),
      ])
      ..limit(50))
      .get();
  }
  
  /// 按仓库搜索
  Future<List<TaskData>> searchInRepository(
    String repositoryId, 
    String query,
  ) async {
    final lowercaseQuery = '%${query.toLowerCase()}%';
    
    return await (select(tasks)
      ..where((t) => 
        t.branchId.isInQuery(
          select(branches)
            ..where((b) => b.repositoryId.equals(repositoryId))
            ..map((b) => b.id)
        ) &
        (t.title.like(lowercaseQuery) | t.description.like(lowercaseQuery))
      )
      ..orderBy([
        (t) => OrderingTerm.desc(t.updatedAt),
      ]))
      .get();
  }
}
```

### 5. 热力图统计

#### 热力图绘制器

```dart
// heatmap_painter.dart
class HeatmapPainter extends CustomPainter {
  final Map<DateTime, int> data;
  final DateTime startDate;
  final DateTime endDate;
  final Color emptyColor;
  final Color fillColor;
  
  HeatmapPainter({
    required this.data,
    required this.startDate,
    required this.endDate,
    this.emptyColor = const Color(0xFFEBEDF0),
    this.fillColor = const Color(0xFF40C463),
  });
  
  @override
  void paint(Canvas canvas, Size size) {
    final cellSize = size.width / 53; // 53 周
    final cellPadding = 2.0;
    
    var currentDate = startDate;
    var weekIndex = 0;
    
    while (currentDate.isBefore(endDate)) {
      final dayOfWeek = currentDate.weekday - 1;
      final count = data[currentDate] ?? 0;
      
      final rect = RRect.fromRectAndRadius(
        Rect.fromLTWH(
          weekIndex * (cellSize + cellPadding),
          dayOfWeek * (cellSize + cellPadding),
          cellSize,
          cellSize,
        ),
        const Radius.circular(2),
      );
      
      final color = _getColorForCount(count);
      final paint = Paint()..color = color;
      
      canvas.drawRRect(rect, paint);
      
      if (dayOfWeek == 6) {
        weekIndex++;
      }
      currentDate = currentDate.add(const Duration(days: 1));
    }
  }
  
  Color _getColorForCount(int count) {
    if (count == 0) return emptyColor;
    if (count <= 3) return fillColor.withOpacity(0.3);
    if (count <= 6) return fillColor.withOpacity(0.6);
    if (count <= 9) return fillColor.withOpacity(0.8);
    return fillColor;
  }
  
  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
```

### 6. Git Graph 可视化

#### Git Graph 绘制器

```dart
// git_graph_painter.dart
class GitGraphPainter extends CustomPainter {
  final List<CommitNode> nodes;
  final Map<String, Color> branchColors;
  
  GitGraphPainter({
    required this.nodes,
    required this.branchColors,
  });
  
  @override
  void paint(Canvas canvas, Size size) {
    final nodeRadius = 6.0;
    final rowHeight = 40.0;
    final columnWidth = 20.0;
    
    for (var i = 0; i < nodes.length; i++) {
      final node = nodes[i];
      final x = node.column * columnWidth + nodeRadius;
      final y = i * rowHeight + nodeRadius;
      
      // 绘制连接线
      for (final parent in node.parents) {
        final parentIndex = nodes.indexOf(parent);
        if (parentIndex >= 0) {
          final parentX = parent.column * columnWidth + nodeRadius;
          final parentY = parentIndex * rowHeight + nodeRadius;
          
          final paint = Paint()
            ..color = branchColors[node.branchId] ?? Colors.grey
            ..strokeWidth = 2
            ..style = PaintingStyle.stroke;
          
          final path = Path()
            ..moveTo(x, y)
            ..cubicTo(
              x, y + rowHeight / 2,
              parentX, parentY - rowHeight / 2,
              parentX, parentY,
            );
          
          canvas.drawPath(path, paint);
        }
      }
      
      // 绘制节点
      final nodePaint = Paint()
        ..color = branchColors[node.branchId] ?? Colors.grey;
      
      canvas.drawCircle(
        Offset(x, y),
        nodeRadius,
        nodePaint,
      );
      
      // 绘制提交信息
      final textPainter = TextPainter(
        text: TextSpan(
          text: node.message,
          style: const TextStyle(
            color: Colors.black87,
            fontSize: 12,
          ),
        ),
        textDirection: TextDirection.ltr,
      );
      
      textPainter.layout();
      textPainter.paint(
        canvas,
        Offset(x + nodeRadius + 8, y - textPainter.height / 2),
      );
    }
  }
  
  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

class CommitNode {
  final String id;
  final String branchId;
  final String message;
  final int column;
  final List<CommitNode> parents;
  
  CommitNode({
    required this.id,
    required this.branchId,
    required this.message,
    required this.column,
    this.parents = const [],
  });
}
```

---

## 🔔 通知系统

### 本地通知实现

```dart
// notification_service.dart
@singleton
class NotificationService {
  final FlutterLocalNotificationsPlugin _plugin;
  
  NotificationService() : _plugin = FlutterLocalNotificationsPlugin() {
    _init();
  }
  
  Future<void> _init() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    
    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );
    
    await _plugin.initialize(initSettings);
  }
  
  /// 调度任务提醒
  Future<void> scheduleTaskReminder({
    required String taskId,
    required String title,
    required DateTime dueDate,
  }) async {
    // 提前 1 小时提醒
    final reminderDate = dueDate.subtract(const Duration(hours: 1));
    
    if (reminderDate.isBefore(DateTime.now())) {
      return; // 已过期，不调度
    }
    
    await _plugin.zonedSchedule(
      taskId.hashCode,
      '任务提醒',
      '$title 即将到期',
      TZDateTime.from(reminderDate, local),
      NotificationDetails(
        android: AndroidNotificationDetails(
          'task_reminder',
          '任务提醒',
          channelDescription: '任务到期提醒通知',
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
      uiLocalNotificationDateInterpretation:
          UILocalNotificationDateInterpretation.absoluteTime,
    );
  }
  
  /// 取消任务提醒
  Future<void> cancelTaskReminder(String taskId) async {
    await _plugin.cancel(taskId.hashCode);
  }
}
```

---

## 🖥️ 桌面端适配

### 窗口管理

```dart
// window_manager_service.dart
@singleton
class WindowManagerService {
  Future<void> init() async {
    await windowManager.ensureInitialized();
    
    const windowOptions = WindowOptions(
      size: Size(1200, 800),
      minimumSize: Size(800, 600),
      center: true,
      backgroundColor: Colors.transparent,
      titleBarStyle: TitleBarStyle.hidden,
      title: 'Commit',
    );
    
    await windowManager.waitUntilReadyToShow(windowOptions, () async {
      await windowManager.show();
      await windowManager.focus();
    });
  }
  
  Future<void> setMinimumSize(Size size) async {
    await windowManager.setMinimumSize(size);
  }
  
  Future<void> setTitle(String title) async {
    await windowManager.setTitle(title);
  }
}
```

### 系统托盘

```dart
// system_tray_service.dart
@singleton
class SystemTrayService {
  final SystemTray _tray = SystemTray();
  
  Future<void> init() async {
    await _tray.initSystemTray(
      title: 'Commit',
      iconPath: 'assets/icons/tray_icon.png',
    );
    
    final menu = [
      MenuItem(
        label: '显示主窗口',
        onClicked: () => windowManager.show(),
      ),
      MenuSeparator(),
      MenuItem(
        label: '退出',
        onClicked: () => windowManager.close(),
      ),
    ];
    
    await _tray.setContextMenu(Menu(items: menu));
    
    _tray.onClick((eventName) {
      if (eventName == kSystemTrayEventClick) {
        windowManager.show();
      }
    });
  }
}
```

---

## 📱 桌面小组件

### iOS Widget (Swift)

```swift
// CommitWidget.swift
import WidgetKit
import SwiftUI

struct CommitWidget: Widget {
    let kind: String = "CommitWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: CommitTimelineProvider()) { entry in
            CommitWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("今日待办")
        .description("显示今日待办任务")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct CommitWidgetEntryView: View {
    var entry: CommitTimelineProvider.Entry
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("今日待办")
                .font(.headline)
            
            ForEach(entry.tasks.prefix(5)) { task in
                HStack {
                    Circle()
                        .fill(task.priority.color)
                        .frame(width: 8, height: 8)
                    Text(task.title)
                        .lineLimit(1)
                }
            }
        }
        .padding()
    }
}
```

### Android Widget (Kotlin)

```xml
<!-- commit_widget.xml -->
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="250dp"
    android:minHeight="110dp"
    android:updatePeriodMillis="3600000"
    android:initialLayout="@layout/widget_commit"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen" />
```

---

## 🔄 数据导出

### JSON 导出

```dart
// export_service.dart
@singleton
class ExportService {
  final IRepositoryRepository _repositoryRepo;
  final IBranchRepository _branchRepo;
  final ITaskRepository _taskRepo;
  
  ExportService(this._repositoryRepo, this._branchRepo, this._taskRepo);
  
  /// 导出为 JSON
  Future<String> exportToJson() async {
    final repositories = await _repositoryRepo.getAll();
    final branches = await _branchRepo.getAll();
    final tasks = await _taskRepo.getAll();
    
    final data = {
      'version': '1.0.0',
      'exportedAt': DateTime.now().toIso8601String(),
      'repositories': repositories.map((r) => r.toJson()).toList(),
      'branches': branches.map((b) => b.toJson()).toList(),
      'tasks': tasks.map((t) => t.toJson()).toList(),
    };
    
    return jsonEncode(data);
  }
  
  /// 导出为 CSV
  Future<String> exportToCsv() async {
    final tasks = await _taskRepo.getAll();
    
    final csv = StringBuffer();
    csv.writeln('ID,标题,描述,状态,优先级,截止日期,创建时间,更新时间');
    
    for (final task in tasks) {
      csv.writeln([
        task.id,
        task.title,
        task.description ?? '',
        task.status.label,
        task.priority.label,
        task.dueDate?.toIso8601String() ?? '',
        task.createdAt.toIso8601String(),
        task.updatedAt.toIso8601String(),
      ].join(','));
    }
    
    return csv.toString();
  }
  
  /// 导出为 Markdown
  Future<String> exportToMarkdown() async {
    final repositories = await _repositoryRepo.getAll();
    final branches = await _branchRepo.getAll();
    final tasks = await _taskRepo.getAll();
    
    final md = StringBuffer();
    md.writeln('# Commit 数据导出');
    md.writeln();
    md.writeln('导出时间: ${DateTime.now()}');
    md.writeln();
    
    for (final repo in repositories) {
      md.writeln('## ${repo.icon} ${repo.name}');
      md.writeln();
      
      final repoBranches = branches.where((b) => b.repositoryId == repo.id);
      for (final branch in repoBranches) {
        md.writeln('### 分支: ${branch.name}');
        md.writeln();
        
        final branchTasks = tasks.where((t) => t.branchId == branch.id);
        for (final task in branchTasks) {
          final status = task.status == TaskStatus.done ? '✅' : '⬜';
          md.writeln('- $status ${task.title}');
          if (task.description != null) {
            md.writeln('  ${task.description}');
          }
        }
        md.writeln();
      }
    }
    
    return md.toString();
  }
}
```

---

## 🧪 测试策略

### 单元测试

```dart
// task_repository_test.dart
void main() {
  late AppDatabase database;
  late LocalTaskRepository repository;
  
  setUp(() {
    database = AppDatabase();
    repository = LocalTaskRepository(database);
  });
  
  tearDown(() async {
    await database.close();
  });
  
  group('LocalTaskRepository', () {
    test('should create task', () async {
      final task = Task(
        branchId: 'branch-1',
        title: 'Test Task',
        status: TaskStatus.todo,
        priority: Priority.medium,
      );
      
      final created = await repository.create(task);
      
      expect(created.id, isNotNull);
      expect(created.title, 'Test Task');
    });
    
    test('should get tasks by branch', () async {
      // Arrange
      await repository.create(Task(
        branchId: 'branch-1',
        title: 'Task 1',
        status: TaskStatus.todo,
        priority: Priority.medium,
      ));
      
      await repository.create(Task(
        branchId: 'branch-2',
        title: 'Task 2',
        status: TaskStatus.todo,
        priority: Priority.medium,
      ));
      
      // Act
      final tasks = await repository.getByBranchId('branch-1');
      
      // Assert
      expect(tasks.length, 1);
      expect(tasks.first.title, 'Task 1');
    });
  });
}
```

### Widget 测试

```dart
// task_card_test.dart
void main() {
  testWidgets('TaskCard should display task title', (tester) async {
    final task = Task(
      id: '1',
      branchId: 'branch-1',
      title: 'Test Task',
      status: TaskStatus.todo,
      priority: Priority.medium,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
    
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: TaskCard(task: task),
        ),
      ),
    );
    
    expect(find.text('Test Task'), findsOneWidget);
  });
}
```

---

## 📊 性能优化

### 数据库优化

```dart
// 索引定义
@DriftAccessor(tables: [Tasks])
class TaskDao extends DatabaseAccessor<AppDatabase> with _$TaskDaoMixin {
  TaskDao(AppDatabase db) : super(db);
  
  @override
  int get schemaVersion => 1;
  
  @override
  MigrationStrategy get migration => MigrationStrategy(
    onCreate: (Migrator m) async {
      await m.createAll();
      
      // 创建索引
      await customStatement(
        'CREATE INDEX idx_tasks_branch_id ON tasks (branch_id)',
      );
      await customStatement(
        'CREATE INDEX idx_tasks_status ON tasks (status)',
      );
      await customStatement(
        'CREATE INDEX idx_tasks_due_date ON tasks (due_date)',
      );
    },
  );
}
```

### 列表优化

```dart
// 使用 ListView.builder 而不是 ListView
ListView.builder(
  itemCount: tasks.length,
  itemBuilder: (context, index) {
    return TaskCard(task: tasks[index]);
  },
  // 添加缓存
  addAutomaticKeepAlives: false,
  addRepaintBoundaries: true,
);
```

---

## 🚀 构建与发布

### Android 签名配置

```gradle
// android/app/build.gradle
android {
    signingConfigs {
        release {
            storeFile file('keystore.jks')
            storePassword System.getenv("STORE_PASSWORD")
            keyAlias System.getenv("KEY_ALIAS")
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
        }
    }
}
```

### iOS 签名配置

```ruby
# ios/Podfile
platform :ios, '15.0'

post_install do |installer|
  installer.pods_project.targets.each do |target|
    flutter_additional_ios_build_settings(target)
  end
end
```

### GitHub Actions CI/CD

```yaml
# .github/workflows/build.yml
name: Build

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.22.0'
      
      - run: flutter pub get
      - run: flutter analyze
      - run: flutter test
      
      - run: flutter build apk --release
      - run: flutter build ios --release --no-codesign
      - run: flutter build macos --release
      - run: flutter build windows --release
```

---

## 📚 参考资料

- [Flutter 官方文档](https://flutter.dev/docs)
- [drift 文档](https://drift.simonbinder.eu/)
- [Riverpod 文档](https://riverpod.dev/)
- [go_router 文档](https://pub.dev/packages/go_router)
