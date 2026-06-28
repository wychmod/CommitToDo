# Commit 项目排查与优化概览

## 完成内容

- 基于 `CLAUDE.md`、`docs/PRD.md`、`docs/system_design.md`、`docs/UI_DESIGN.md` 对当前 Flutter 项目做了实现一致性审计与二轮优化。
- 已推进用户指定的 P0/P1 项：测试补齐、Material Icons 替换、数据导出落盘、搜索历史持久化、Git Graph 缩放控制。
- 已继续尝试执行 Drift 代码生成前置检查，但当前环境仍未发现 `flutter` / `dart` 命令，无法真实运行 `build_runner`、`analyze`、`test`。

## 主要发现

| 类型 | 问题 | 影响 | 当前状态 |
|---|---|---|---|
| 构建 | `*.g.dart` 仍是 Drift 占位文件 | 项目无法真实编译运行 | 阻塞：需本机 Flutter/Dart 环境执行生成 |
| 测试 | 初始测试覆盖不足 | 不满足 `CLAUDE.md` 测试约束 | 已新增核心 UseCase/热力图单元测试，待运行验证 |
| 图标 | Material Icons 占位不符合 UI 规范 | 与 Heroicons SVG 设计约束不一致 | 已改为 `AppIconName` + `AppIcon` SVG 系统 |
| PRD P1 | 数据导出、搜索历史、Git Graph 缩放不完整 | 后续功能缺口 | 数据导出已支持选择路径保存；其余已补齐基础实现，待运行验证 |
| 无障碍 | 多处交互控件使用 `GestureDetector` | 读屏/焦点/点击反馈不足 | 已将可见遗留 `GestureDetector` 替换为 `Semantics` + `InkWell` |
| 主题 | 深色模式开关原本未真正控制 App 主题 | 设置项不可用 | 已接入 `settingsProvider` 与 light/dark theme |
| 数据一致性 | 删除仓库/分支缺少级联软删除 | 可能残留孤儿数据 | 已优化 DAO 事务逻辑 |
| 热力图 | 统计口径未严格限制完成任务 | 数据可能偏差 | 已限制 `done` 且 `completedAt != null` |

## 已实施优化

### 1. 主题与无障碍

- `lib/app.dart` / `lib/main.dart`
  - 接入 `settingsProvider` 控制 `ThemeMode`。
  - 支持 `buildLightTheme()` 与 `buildDarkTheme()`。
  - 移除 `TextScaler.noScaling`，恢复系统字体缩放。
- `lib/core/theme/app_theme.dart`
  - 新增浅色主题。
  - 修复深色主题按钮文字对比度。
- 核心交互组件
  - `RepositoryCard`、`TaskCard`、`BranchIndicator`、`BottomNavWidget`、`AppCard`、搜索页、设置项、Git Graph 缩放按钮、任务表单优先级/日期选择、仓库分支新增按钮等改为 `Semantics` + `InkWell`。
  - 当前搜索 `GestureDetector` 已无匹配。

### 2. 数据一致性与业务闭环

- `lib/data/database/daos/repository_dao.dart`
  - 仓库列表过滤归档仓库。
  - 删除仓库时事务化级联软删除关联分支和任务。
  - 恢复仓库时同步恢复主分支。
- `lib/data/database/daos/branch_dao.dart`
  - 删除分支时级联软删除该分支下任务。
- `lib/data/database/daos/task_dao.dart`
  - 热力图查询增加 `status == done` 和 `completedAt IS NOT NULL`。
- `lib/presentation/screens/repository/*`
  - 仓库详情页标题从 repositoryId 改为仓库名称。
  - 任务长按菜单接入 `DeleteTaskUseCase`。

### 3. Heroicons SVG 图标系统

- `lib/core/theme/app_icons.dart`
  - 建立 `AppIconName` 枚举与 `AppIcon` 组件。
  - 使用 `flutter_svg` 的 `SvgPicture.string` 渲染内联 Heroicons 风格 SVG。
- 已替换 UI 层直接 `Icons.*` / `IconData` 使用点。
- 当前搜索结果：`Icons.`、`IconData`、`AppAppIcon`、`checkCircle_outline` 均无匹配。

### 4. PRD 后续项

- `lib/domain/services/data_export_service.dart`
  - 新增 `DataExportService`。
  - 支持 JSON / CSV / Markdown 文本导出。
  - 已补充缺失的 `Repository` 实体导入。
- `lib/core/di/injection_container.dart`
  - 注册 `DataExportService`。
- `lib/presentation/screens/settings/settings_screen.dart`
  - “导出数据”打开格式选择底部弹层。
  - 使用 `FilePicker.platform.saveFile` 选择保存路径。
  - 将 JSON / CSV / Markdown 内容编码为 UTF-8 字节并写入目标文件。
  - 取消保存时保留预览弹窗，方便复制导出内容。
- `lib/presentation/screens/search/search_notifier.dart`
  - 使用 `SharedPreferences` 持久化搜索历史。
  - 搜索词去重、插入到顶部、最多保留 10 条。
- `lib/presentation/screens/graph/git_graph_screen.dart`
  - 使用持久化 `TransformationController`。
  - 增加 zoom in / zoom out / reset。
  - 正确 dispose controller。

### 5. 测试补齐

已新增：

- `test/unit/domain/usecases/task/task_usecases_test.dart`
  - 覆盖创建任务 trim 标题、空标题异常、完成任务、重复完成异常、删除任务提交记录等。
- `test/unit/domain/usecases/branch/merge_branch_usecase_test.dart`
  - 覆盖未完成任务移动到目标分支、完成任务不移动、记录 merge commit、删除源分支、非法参数异常。
- `test/unit/domain/usecases/data/heatmap_grouping_test.dart`
  - 覆盖热力图只统计已完成且有 `completedAt` 的任务，并按日期聚合。

## 验证结果

| 验证项 | 结果 | 说明 |
|---|---|---|
| Flutter 命令检查 | 未通过 | `Get-Command flutter` 未找到 |
| Dart 命令检查 | 未通过 | `Get-Command dart` 未找到 |
| 常见 Flutter 安装路径检查 | 未找到 | `C:\flutter`、`D:\flutter`、`C:\src\flutter` 等无命中 |
| Drift 生成文件检查 | 阻塞存在 | `app_database.g.dart` 与 DAO `.g.dart` 仍是 placeholder |
| Material Icons 搜索 | 通过 | `Icons.` / `IconData` 无匹配 |
| 错误替换搜索 | 通过 | `AppAppIcon` / `AppAppIcons` / `checkCircle_outline` 无匹配 |
| GestureDetector 搜索 | 通过 | 当前 `lib/**/*.dart` 无匹配 |
| 测试执行 | 未完成 | 受 Flutter/Dart 工具链缺失阻塞 |
| 静态分析 | 未完成 | 受 Flutter/Dart 工具链缺失阻塞 |

## 当前最大阻塞

Drift 真实生成代码仍未完成。当前占位文件包括：

- `lib/data/database/app_database.g.dart`
- `lib/data/database/daos/repository_dao.g.dart`
- `lib/data/database/daos/branch_dao.g.dart`
- `lib/data/database/daos/task_dao.g.dart`
- `lib/data/database/daos/commit_dao.g.dart`

需要在安装 Flutter/Dart 的环境执行：

```bash
flutter pub get
dart run build_runner build --delete-conflicting-outputs
dart format lib test
flutter analyze
flutter test
```

## 后续建议

1. 先配置 Flutter SDK 到 PATH，并执行上述验证命令。
2. 根据 `build_runner` 真实输出修复 Drift 表/DAO/Repository 可能暴露的类型问题。
3. 根据 `flutter analyze` 修复导入顺序、lint、空安全和上下文使用问题。
4. 根据 `flutter test` 修正新增测试中的 Fake Repository 签名或 UseCase 预期差异。
5. 为“导入数据”和“清除已删除项目”补齐领域用例与数据层实现，再接入设置页真实动作。
6. 继续补 Widget Test / DAO Test，使覆盖率更接近 `CLAUDE.md` 要求。
