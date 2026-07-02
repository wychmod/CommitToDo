# 多端防串台落地方案

**版本**: 1.0.0
**创建日期**: 2026-07-01
**状态**: 待执行
**关联文档**: `CLAUDE.md`、`overview.md`、`docs/system_design.md`、`docs/TECHNICAL.md`

---

## 1. 背景与目标

### 1.1 问题

Commit 是单一 Flutter 工程，意图覆盖 **Windows、macOS、Android、iOS** 四端，样式统一、业务一致。但当前架构存在三类「改一端坏另一端」的高风险：

| 风险类型 | 根因 | 是否会单独坏某端 |
|---|---|---|
| 共享业务/数据层串台 | 四端共用同一套 Provider → UseCase → Repository → Drift DB | ❌ 一坏坏四端 |
| 断点分支漏测 | `AppScaffold` 等 Widget 内 `if (isDesktop) {...} else {...}` 只测了一个分支 | ⚠️ 漏测另一尺寸 |
| 平台原生能力串台 | 未来接入 `window_manager` / `system_tray` / 通知 / 文件保存时散落 `Platform.isXxx` | ⚠️ 会单独坏某端 |

### 1.2 核心结论

**不拆工程。** 四端是「统一设计系统 + 统一业务」，物理拆分只会让一个 bug 改四遍、token 难同步，反收益。

真正消除「修一端坏另一端」的是三件事：

1. **测试护栏** — 防共享层串台
2. **平台服务收口** — 防原生能力串台
3. **多平台 CI 门禁** — 兜底

### 1.3 目标

- 任何共享层改动，本地测试红灯即暴露，而非等用户发现。
- 平台差异集中在 `platform/` 层，UI 永远只调接口。
- 多平台构建在 CI 拦截「在手机端调了桌面专属 API」类问题。

---

## 2. 架构原则（不拆工程的依据）

### 2.1 方案对比

| 方案 | 适合场景 | 代价 | 是否采用 |
|---|---|---|---|
| **保持单工程** | 业务四端一致、UI 统一设计系统 | 一份代码，靠测试+边界保护 | ✅ 采用 |
| 多 flavor / 多入口 | 业务相同但 UI/导航差异大 | 中等，仍共享 domain/data | ❌ 暂不需要 |
| 多独立工程 / monorepo | 四端业务或团队真正分叉 | 高，重复代码、token 难同步 | ❌ 暂不需要 |

### 2.2 共享与隔离边界

```
四端 UI  ──►  同一套 Provider  ──►  同一套 UseCase  ──►  同一套 Repository  ──►  同一个 Drift DB
   │              │                     │                     │
   │              │                     │                     └─ 共享：靠测试护栏
   │              │                     └─ 共享：靠测试护栏
   │              └─ 共享：靠测试护栏
   └─ 布局断点：靠双尺寸 Widget 测试
                                      
平台原生能力 ──► platform/ 层接口 ──► 各端实现（DI 注入）   ──► 隔离：物理上不互相影响
```

---

## 3. 落地顺序（五步，可分时执行）

> 前置说明：当前 `*.g.dart` 仍是 Drift 占位文件，本机无 Flutter/Dart 工具链，项目尚无法编译运行（见 `overview.md`）。**第 1 步不跨过去，后续都白搭。**

### 步骤 1：打通工具链与代码生成

**目的**：让项目可编译、测试可跑。

**动作**：
- 安装 Flutter SDK 并配置到 PATH。
- 执行：
  ```bash
  flutter pub get
  dart run build_runner build --delete-conflicting-outputs
  dart format lib test
  flutter analyze
  flutter test
  ```
- 根据 `build_runner` 真实输出修复 Drift 表 / DAO / Repository 可能暴露的类型问题。

**完成标准**：
- [ ] `flutter analyze` 无错误
- [ ] `flutter test` 现有用例全部通过
- [ ] `*.g.dart` 不再是占位文件

### 步骤 2：补齐共享层单元测试（最高优先级护栏）

**目的**：把「共享业务/数据层一坏坏四端」转化为「本地红灯」。

**动作**（按 CLAUDE.md 覆盖率目标：核心业务 > 80%）：

| 层 | 测试对象 | 覆盖点 | 现状 |
|---|---|---|---|
| Domain UseCase | task/branch/repository 用例 | happy path + 异常（空标题、重复完成、非法合并参数等） | 已起骨架，待扩展 |
| DAO | repository/branch/task/commit DAO | 级联软删除、热力图查询口径（`done` 且 `completedAt != null`）、归档过滤 | 未补 |
| Repository | Local*Repository | Entity ↔ Model 转换、软删除过滤 | 未补 |
| Domain Service | DataExportService | JSON/CSV/Markdown 输出格式 | 未补 |

**新增测试文件建议位置**：
- `test/unit/data/daos/*_dao_test.dart`
- `test/unit/data/repositories/*_repository_test.dart`
- `test/unit/domain/services/data_export_service_test.dart`

**完成标准**：
- [ ] 核心业务逻辑覆盖率 > 80%
- [ ] 级联软删除、热力图口径有专门用例
- [ ] `flutter test` 通过

### 步骤 3：建立「双尺寸」Widget 测试规矩（防断点漏测）

**目的**：堵住 `if (isDesktop) {...} else {...}` 只测一个分支的坑。

**动作**：
- 对所有带 `LayoutBuilder` / 宽度断点判断的 Widget，Widget 测试必须覆盖两个尺寸：
  - 桌面尺寸：≥ 840px（侧边导航）
  - 手机尺寸：< 840px（底部导航）
- 用 `tester.view.physicalSize` / `tester.binding.window.physicalSizeTestValue` 切换尺寸后 `pumpWidget`，分别断言两个分支渲染正确。

**首要覆盖**：
- `AppScaffold`（侧栏 vs 底部导航）
- `home_screen.dart`（响应式网格）

**约定**（建议写回 `CLAUDE.md` 测试规范）：
> 任何带断点判断的 Widget，测试必须覆盖两个尺寸分支，否则不予合入。

**完成标准**：
- [ ] `AppScaffold` 双尺寸 Widget 测试通过
- [ ] 断点测试约定写入 `CLAUDE.md`
- [ ] UI 组件覆盖率 > 50%

### 步骤 4：建立 `platform/` 服务层（防原生能力串台，现在就能动手）

**目的**：把未来要接的平台原生能力收口到接口，UI 只调接口，平台差异集中在一处。

**动作**：

1. 在 Domain 层定义平台服务接口：
   - `domain/services/i_window_service.dart`
   - `domain/services/i_tray_service.dart`
   - `domain/services/i_notification_service.dart`（如已存在则对齐）
   - `domain/services/i_file_save_service.dart`

2. 在 `platform/` 目录实现各端版本（先空实现 / no-op）：
   ```
   platform/
   ├── desktop/
   │   ├── desktop_window_service.dart   # 用 window_manager
   │   └── desktop_tray_service.dart     # 用 system_tray
   ├── mobile/
   │   ├── mobile_window_service.dart    # no-op
   │   └── mobile_tray_service.dart      # no-op
   └── notification/
       ├── mobile_notification_service.dart  # flutter_local_notifications
       └── desktop_notification_service.dart
   ```

3. 在 `core/di/injection_container.dart` 按 `Platform.isXxx` 注册对应实现：
   ```dart
   if (Platform.isWindows || Platform.isMacOS) {
     registerSingleton<IWindowService>(DesktopWindowService());
   } else {
     registerSingleton<IWindowService>(MobileWindowService()); // no-op
   }
   ```

4. UI / `main.dart` 永远只 `getIt<IWindowService>()`，不直接 import `window_manager`。

**完成标准**：
- [ ] `platform/` 目录建立，至少 `IWindowService` / `ITrayService` 接口 + 各端空实现就位
- [ ] DI 按平台注册
- [ ] `lib/**/*.dart` 中无散落的 `Platform.isXxx` 直接调用（除 DI 装配处）
- [ ] 移动端调用桌面专属 API 被物理隔离（no-op 或抛 `UnsupportedError`）

### 步骤 5：多平台 CI 构建门禁（兜底）

**目的**：在 CI 拦截「在手机端调了桌面专属 API」「某平台编译不过」类问题。

**动作**：
- CI 矩阵至少包含：
  - `flutter analyze`
  - `flutter test`
  - `flutter build apk --debug`（Android）
  - `flutter build ios --debug --no-codesign`（iOS，macOS runner）
  - `flutter build windows --debug`（Windows，windows runner）
  - `flutter build macos --debug`（macOS，macOS runner）
- 各平台构建前需先生成各平台壳目录：`flutter create --platforms=android,ios,windows,macos .`
- CI 失败即拦截合入。

**完成标准**：
- [ ] 四端 debug 构建在 CI 全绿
- [ ] analyze + test 在 CI 全绿
- [ ] 平台壳目录（`android/` `ios/` `windows/` `macos/`）已生成并纳入版本管理

---

## 4. 各步骤依赖与可并行性

```
步骤1 (工具链/代码生成)
   │
   ├──► 步骤2 (共享层单测)        ── 可与步骤3 并行
   ├──► 步骤3 (双尺寸 Widget 测试) ── 可与步骤2 并行
   │
   └──► 步骤4 (platform/ 服务层)   ── 独立，可随时启动（不依赖 1 也能先建骨架）
           │
           └──► 步骤5 (多平台 CI)  ── 依赖步骤1 + 步骤4 完成
```

- **步骤 1 是硬前置**：不打通编译，2/3/5 都无法验证。
- **步骤 4 可优先启动**：建接口骨架不依赖工具链，是「现在就能动手、且能预防未来平台串台」的工作。
- **步骤 2/3 可并行**：一个是 domain/data 单测，一个是 UI 双尺寸测试，互不阻塞。

---

## 5. 验收清单（整体）

- [ ] Flutter SDK 就位，`flutter analyze` / `flutter test` 本地可跑
- [ ] Drift `*.g.dart` 真实生成，项目可编译
- [ ] 核心业务逻辑测试覆盖率 > 80%
- [ ] UI 组件测试覆盖率 > 50%
- [ ] 断点 Widget 双尺寸测试约定写入 `CLAUDE.md`
- [ ] `platform/` 服务层建立，平台差异收口
- [ ] 四端平台壳目录生成
- [ ] 多平台 CI 构建矩阵全绿

---

## 6. 风险与回滚

| 风险 | 应对 |
|---|---|
| `build_runner` 输出与现有占位文件差异大，引发连锁类型错误 | 步骤 1 单独小步推进，先让 analyze 通过再补测试 |
| Drift 内存数据库测试与真实 SQLite 行为有差异 | 关键 DAO 测试用真实文件 DB 临时路径复核一次 |
| `platform/` 接口设计过早抽象，后续需求不匹配 | 先只抽象「确定要接」的窗口/托盘/通知/文件保存，不过度设计 |
| 多平台 CI runner 成本/配置复杂 | 先上 Android + Windows 两端，iOS/macOS 后续补 |

---

## 7. 备注

- 本方案与 `CLAUDE.md` 的分层、测试、命名规范完全一致，执行时遵守其约束。
- 执行进度建议同步更新到 `overview.md` 的「已实施优化」与「验证结果」表格。
