# Commit - 开发规范约束文档

**版本**: 1.0.0  
**更新日期**: 2026-05-28  
**适用范围**: Commit 项目全平台开发

---

## 📌 核心原则

### 1. 代码质量优先
- **可读性 > 简洁性**：代码首先是给人看的，其次才是给机器执行的
- **一致性 > 个人偏好**：遵循项目已有风格，不引入个人习惯
- **显式 > 隐式**：明确的代码比巧妙的代码更好维护

### 2. 架构纪律
- **严格分层**：Presentation → Application → Domain → Data，禁止跨层调用
- **依赖倒置**：Domain 层定义接口，Data 层实现接口
- **单一职责**：每个类/函数只做一件事

### 3. 测试驱动
- **先写测试，再写实现**（理想情况）
- **至少同步编写**：不允许提交没有测试的业务逻辑代码
- **测试覆盖率**：核心业务逻辑 > 80%，UI 组件 > 50%

---

## 📁 项目结构规范

### 目录命名
```
lib/
├── core/           # 核心工具层（小写字母，单词间用下划线）
├── data/           # 数据层
├── domain/         # 领域层
├── presentation/   # 表现层
└── platform/       # 平台特定代码
```

### 文件命名规范

| 类型 | 命名规范 | 示例 |
|------|---------|------|
| **Screen** | `{name}_screen.dart` | `home_screen.dart` |
| **Widget** | `{name}_widget.dart` | `task_card_widget.dart` |
| **Provider** | `{name}_provider.dart` | `task_provider.dart` |
| **Notifier** | `{name}_notifier.dart` | `task_notifier.dart` |
| **State** | `{name}_state.dart` | `task_state.dart` |
| **Repository** | `{name}_repository.dart` | `task_repository.dart` |
| **UseCase** | `{name}_usecase.dart` | `create_task_usecase.dart` |
| **Service** | `{name}_service.dart` | `notification_service.dart` |
| **Model** | `{name}_model.dart` | `task_model.dart` |
| **Entity** | `{name}.dart` | `task.dart` |
| **Table** | `{name}_table.dart` | `tasks_table.dart` |
| **DAO** | `{name}_dao.dart` | `task_dao.dart` |
| **Extension** | `{name}_extensions.dart` | `date_extensions.dart` |
| **Constants** | `{name}_constants.dart` | `app_constants.dart` |
| **Painter** | `{name}_painter.dart` | `heatmap_painter.dart` |

### 类命名规范

| 类型 | 命名规范 | 示例 |
|------|---------|------|
| **Screen** | `{Name}Screen` | `HomeScreen` |
| **Widget** | `{Name}Widget` 或描述性名称 | `TaskCard`, `BranchIndicator` |
| **Provider** | `{Name}Provider` | `taskProvider` |
| **Notifier** | `{Name}Notifier` | `TaskNotifier` |
| **State** | `{Name}State` | `TaskState` |
| **Repository** | `{Name}Repository` | `LocalTaskRepository` |
| **UseCase** | `{Name}UseCase` | `CreateTaskUseCase` |
| **Service** | `{Name}Service` | `NotificationService` |
| **Model** | `{Name}Model` | `TaskModel` |
| **Entity** | `{Name}` | `Task`, `Branch`, `Repository` |
| **Table** | `{Name}s` (复数) | `Tasks`, `Branches` |
| **DAO** | `{Name}Dao` | `TaskDao` |
| **Enum** | `{Name}` (单数) | `TaskStatus`, `Priority` |

---

## 🎨 代码风格规范

### Dart 代码风格

#### 命名约定
```dart
// ✅ 正确
class TaskRepository {
  final String taskId;
  final bool isCompleted;
  
  Future<List<Task>> getTasks() async {}
  void _privateMethod() {}
}

// ❌ 错误
class task_repository {
  final String task_id;
  final bool completed;
  
  Future<List<Task>> get_tasks() async {}
}
```

#### 常量命名
```dart
// ✅ 正确
const String appName = 'Commit';
const int maxTaskTitleLength = 100;
const double defaultPadding = 16.0;

// ❌ 错误
const String APP_NAME = 'Commit';
const int MAX_TASK_TITLE_LENGTH = 100;
```

#### 枚举命名
```dart
// ✅ 正确
enum TaskStatus {
  todo,
  inProgress,
  done,
  cancelled,
}

// ❌ 错误
enum TaskStatus {
  TODO,
  IN_PROGRESS,
  DONE,
  CANCELLED,
}
```

### 代码格式

#### 缩进和空格
- 使用 2 个空格缩进
- 运算符前后加空格
- 逗号后加空格

```dart
// ✅ 正确
if (condition) {
  doSomething();
}

final result = a + b;
final list = [1, 2, 3];

// ❌ 错误
if(condition){
  doSomething();
}

final result=a+b;
final list=[1,2,3];
```

#### 行长度
- 最大行长度：80 字符
- 超过时换行，缩进 2 个空格

```dart
// ✅ 正确
final veryLongVariableName = someObject
    .methodOne()
    .methodTwo()
    .methodThree();

// ❌ 错误
final veryLongVariableName = someObject.methodOne().methodTwo().methodThree();
```

#### 括号使用
```dart
// ✅ 正确 - 单行 if 语句可以省略括号
if (condition) return;

// ✅ 正确 - 多行 if 语句必须加括号
if (condition) {
  doSomething();
  doSomethingElse();
}

// ❌ 错误
if (condition)
  doSomething();
  doSomethingElse(); // 这行不在 if 块内
```

---

## 🏗️ 架构规范

### 分层依赖规则

```
Presentation → Application → Domain ← Data
     ↑              ↑           ↑        ↑
     └──────────────┴───────────┴────────┘
                   只能向下依赖
```

#### 禁止的依赖
```dart
// ❌ 错误 - Presentation 直接依赖 Data
import 'package:commit/data/repositories/local_task_repository.dart';

// ❌ 错误 - Domain 依赖 Data
import 'package:commit/data/models/task_model.dart';

// ❌ 错误 - Data 依赖 Presentation
import 'package:commit/presentation/screens/home/home_screen.dart';
```

#### 正确的依赖
```dart
// ✅ 正确 - Presentation 依赖 Domain
import 'package:commit/domain/entities/task.dart';
import 'package:commit/domain/repositories/i_task_repository.dart';

// ✅ 正确 - Data 实现 Domain 接口
import 'package:commit/domain/repositories/i_task_repository.dart';

// ✅ 正确 - Application 依赖 Domain
import 'package:commit/domain/entities/task.dart';
import 'package:commit/domain/repositories/i_task_repository.dart';
```

### Repository 模式规范

#### 接口定义
```dart
// ✅ 正确 - 在 Domain 层定义接口
abstract class ITaskRepository {
  Future<List<Task>> getAll();
  Future<Task?> getById(String id);
  Future<Task> create(Task task);
  Future<Task> update(Task task);
  Future<void> delete(String id);
}

// ❌ 错误 - 在 Data 层定义接口
abstract class TaskRepository {
  // ...
}
```

#### 实现规范
```dart
// ✅ 正确 - 在 Data 层实现接口
class LocalTaskRepository implements ITaskRepository {
  final AppDatabase _db;
  
  LocalTaskRepository(this._db);
  
  @override
  Future<List<Task>> getAll() async {
    // 实现细节
  }
}

// ❌ 错误 - 继承而不是实现
class LocalTaskRepository extends ITaskRepository {
  // ...
}
```

### Use Case 规范

```dart
// ✅ 正确 - 单一职责，只做一件事
@injectable
class CreateTaskUseCase {
  final ITaskRepository _repository;
  
  CreateTaskUseCase(this._repository);
  
  Future<Task> execute({
    required String branchId,
    required String title,
    String? description,
    Priority priority = Priority.medium,
    DateTime? dueDate,
  }) async {
    final task = Task(
      branchId: branchId,
      title: title,
      description: description,
      priority: priority,
      dueDate: dueDate,
      status: TaskStatus.todo,
    );
    
    return await _repository.create(task);
  }
}

// ❌ 错误 - 一个 Use Case 做多件事
@injectable
class TaskUseCase {
  Future<Task> create(...) async {}
  Future<Task> update(...) async {}
  Future<void> delete(...) async {}
  Future<List<Task>> search(...) async {}
}
```

---

## 📱 UI 开发规范

### Widget 设计原则

#### 组合优于继承
```dart
// ✅ 正确 - 使用组合
class TaskCard extends StatelessWidget {
  final Task task;
  final VoidCallback? onTap;
  final VoidCallback? onDelete;
  
  const TaskCard({
    super.key,
    required this.task,
    this.onTap,
    this.onDelete,
  });
  
  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        title: Text(task.title),
        subtitle: TaskStatusBadge(status: task.status),
        trailing: onDelete != null
            ? IconButton(
                icon: const Icon(Icons.delete),
                onPressed: onDelete,
              )
            : null,
        onTap: onTap,
      ),
    );
  }
}

// ❌ 错误 - 继承 StatelessWidget 并添加过多参数
class TaskCard extends StatelessWidget {
  final Task task;
  final bool showDelete;
  final bool showStatus;
  final bool showPriority;
  final bool showDueDate;
  // ... 过多参数
}
```

#### 提取可复用组件
```dart
// ✅ 正确 - 提取可复用组件
class StatusBadge extends StatelessWidget {
  final String label;
  final Color color;
  
  const StatusBadge({
    super.key,
    required this.label,
    required this.color,
  });
  
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: TextStyle(color: color, fontSize: 12),
      ),
    );
  }
}

// ❌ 错误 - 在每个需要的地方重复相同的代码
Container(
  padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
  decoration: BoxDecoration(
    color: Colors.blue.withOpacity(0.1),
    borderRadius: BorderRadius.circular(12),
  ),
  child: Text('待办', style: TextStyle(color: Colors.blue, fontSize: 12)),
)
```

### 状态管理规范

#### Riverpod Provider 规范
```dart
// ✅ 正确 - 使用 @riverpod 注解
@riverpod
class TaskNotifier extends _$TaskNotifier {
  @override
  Future<List<Task>> build() async {
    final repository = ref.read(taskRepositoryProvider);
    return await repository.getAll();
  }
  
  Future<void> addTask(Task task) async {
    state = const AsyncValue.loading();
    
    try {
      final repository = ref.read(taskRepositoryProvider);
      await repository.create(task);
      
      // 刷新列表
      ref.invalidateSelf();
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }
}

// ❌ 错误 - 手动管理状态
class TaskNotifier extends StateNotifier<List<Task>> {
  TaskNotifier() : super([]);
  
  Future<void> loadTasks() async {
    // 手动管理 loading、error 状态
  }
}
```

#### Widget 中消费状态
```dart
// ✅ 正确 - 使用 ConsumerWidget
class TaskListScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tasksAsync = ref.watch(taskNotifierProvider);
    
    return tasksAsync.when(
      data: (tasks) => ListView.builder(
        itemCount: tasks.length,
        itemBuilder: (context, index) {
          return TaskCard(task: tasks[index]);
        },
      ),
      loading: () => const CircularProgressIndicator(),
      error: (error, stack) => ErrorWidget(error),
    );
  }
}

// ❌ 错误 - 手动管理状态
class TaskListScreen extends StatefulWidget {
  @override
  _TaskListScreenState createState() => _TaskListScreenState();
}

class _TaskListScreenState extends State<TaskListScreen> {
  List<Task> tasks = [];
  bool isLoading = false;
  String? error;
  
  @override
  void initState() {
    super.initState();
    _loadTasks();
  }
  
  Future<void> _loadTasks() async {
    setState(() => isLoading = true);
    // ...
  }
}
```

---

## 🗄️ 数据库规范

### drift 表定义规范

```dart
// ✅ 正确 - 使用 @DataClassName 注解
@DataClassName('TaskData')
class Tasks extends Table {
  TextColumn get id => text()();
  TextColumn get title => text()();
  IntColumn get status => intEnum<TaskStatus>()();
  DateTimeColumn get createdAt => dateTime()();
  
  @override
  Set<Column> get primaryKey => {id};
}

// ❌ 错误 - 不使用 @DataClassName
class Tasks extends Table {
  // ...
}
```

### DAO 规范

```dart
// ✅ 正确 - 使用 @DriftAccessor 注解
@DriftAccessor(tables: [Tasks, Branches])
class TaskDao extends DatabaseAccessor<AppDatabase> with _$TaskDaoMixin {
  TaskDao(AppDatabase db) : super(db);
  
  Future<List<TaskData>> getAll() async {
    return await select(tasks).get();
  }
  
  Future<TaskData?> getById(String id) async {
    return await (select(tasks)..where((t) => t.id.equals(id)))
        .getSingleOrNull();
  }
}

// ❌ 错误 - 直接在 Repository 中写 SQL
class LocalTaskRepository {
  Future<List<Task>> getAll() async {
    final result = await _db.customSelect('SELECT * FROM tasks').get();
    // ...
  }
}
```

### 数据库迁移规范

```dart
// ✅ 正确 - 版本化迁移
@override
int get schemaVersion => 2;

@override
MigrationStrategy get migration => MigrationStrategy(
  onCreate: (Migrator m) async {
    await m.createAll();
  },
  onUpgrade: (Migrator m, int from, int to) async {
    if (from < 2) {
      // 添加新列
      await m.addColumn(tasks, tasks.priority);
    }
  },
);

// ❌ 错误 - 破坏性迁移
@override
MigrationStrategy get migration => MigrationStrategy(
  onCreate: (Migrator m) async {
    await m.createAll();
  },
  onUpgrade: (Migrator m, int from, int to) async {
    // 删除所有表并重新创建
    await m.deleteAll();
    await m.createAll();
  },
);
```

---

## 🧪 测试规范

### 单元测试规范

```dart
// ✅ 正确 - 使用 AAA 模式
void main() {
  group('CreateTaskUseCase', () {
    late MockTaskRepository mockRepository;
    late CreateTaskUseCase useCase;
    
    setUp(() {
      mockRepository = MockTaskRepository();
      useCase = CreateTaskUseCase(mockRepository);
    });
    
    test('should create task with correct parameters', () async {
      // Arrange
      final task = Task(
        branchId: 'branch-1',
        title: 'Test Task',
        status: TaskStatus.todo,
        priority: Priority.medium,
      );
      
      when(() => mockRepository.create(any()))
          .thenAnswer((_) async => task);
      
      // Act
      final result = await useCase.execute(
        branchId: 'branch-1',
        title: 'Test Task',
      );
      
      // Assert
      expect(result.title, 'Test Task');
      verify(() => mockRepository.create(any())).called(1);
    });
    
    test('should throw exception when title is empty', () async {
      // Arrange & Act & Assert
      expect(
        () => useCase.execute(branchId: 'branch-1', title: ''),
        throwsA(isA<ArgumentError>()),
      );
    });
  });
}

// ❌ 错误 - 测试多个不相关的功能
void main() {
  test('task operations', () async {
    // 创建任务
    // 更新任务
    // 删除任务
    // 搜索任务
    // ... 测试太多东西
  });
}
```

### Widget 测试规范

```dart
// ✅ 正确 - 测试特定行为
void main() {
  group('TaskCard', () {
    testWidgets('should display task title', (tester) async {
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
    
    testWidgets('should call onTap when tapped', (tester) async {
      // Arrange
      bool tapped = false;
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
            body: TaskCard(
              task: task,
              onTap: () => tapped = true,
            ),
          ),
        ),
      );
      
      // Act
      await tester.tap(find.byType(TaskCard));
      
      // Assert
      expect(tapped, true);
    });
  });
}

// ❌ 错误 - 测试实现细节而非行为
void main() {
  testWidgets('should have correct widget tree', (tester) async {
    await tester.pumpWidget(/* ... */);
    
    expect(find.byType(Card), findsOneWidget);
    expect(find.byType(ListTile), findsOneWidget);
    expect(find.byType(Text), findsNWidgets(2));
    // ... 测试实现细节
  });
}
```

---

## 🔧 工具配置规范

### analysis_options.yaml

```yaml
# analysis_options.yaml
include: package:very_good_analysis/analysis_options.yaml

analyzer:
  exclude:
    - '**/*.g.dart'
    - '**/*.freezed.dart'
    - 'lib/generated/**'
  
  errors:
    invalid_annotation_target: ignore
  
  language:
    strict-casts: true
    strict-inference: true
    strict-raw-types: true

linter:
  rules:
    - prefer_const_constructors
    - prefer_const_declarations
    - prefer_final_locals
    - avoid_print
    - avoid_unnecessary_containers
    - prefer_single_quotes
    - sort_child_properties_last
    - use_build_context_synchronously
```

### build.yaml

```yaml
# build.yaml
targets:
  $default:
    builders:
      drift_dev:
        options:
          generate_connect_constructor: true
          sqlite_modules:
            - json1
            - fts5
      
      riverpod_generator:
        options:
          emit_hash: false
      
      injectable_generator:
        options:
          auto_register: true
          prefer_relative_imports: true
          extension_for:
            - StateNotifier
            - ChangeNotifier
```

---

## 📝 提交规范

### Commit Message 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Type 类型
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具链/辅助库更新

#### 示例
```
feat(task): 添加任务优先级功能

- 为任务添加高/中/低三个优先级
- 支持按优先级排序
- 更新任务卡片 UI 显示优先级

Closes #123
```

---

## 🚀 发布规范

### 版本号规范

使用语义化版本号：`MAJOR.MINOR.PATCH`

- **MAJOR**: 不兼容的 API 变更
- **MINOR**: 向后兼容的功能性新增
- **PATCH**: 向后兼容的问题修正

#### 示例
```
1.0.0 - 初始版本
1.1.0 - 添加新功能
1.1.1 - 修复 bug
2.0.0 - 重大更新
```

### 发布检查清单

- [ ] 所有测试通过
- [ ] 代码分析无警告
- [ ] 版本号已更新
- [ ] CHANGELOG 已更新
- [ ] 文档已更新
- [ ] 在目标平台测试通过
- [ ] 性能测试通过

---

## 📚 参考资源

- [Dart 官方风格指南](https://dart.dev/guides/language/effective-dart/style)
- [Flutter 最佳实践](https://flutter.dev/docs/perf/best-practices)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Riverpod 最佳实践](https://riverpod.dev/docs/essentials/first_request)
