import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../screens/graph/git_graph_screen.dart';
import '../screens/heatmap/heatmap_screen.dart';
import '../screens/home/home_screen.dart';
import '../screens/repository/repository_screen.dart';
import '../screens/search/search_screen.dart';
import '../screens/settings/settings_screen.dart';
import '../screens/task/task_detail_screen.dart';
import '../screens/task/task_form_screen.dart';
import '../widgets/common/bottom_nav_widget.dart';

/// 应用路由 Provider
final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/',
    routes: [
      // Shell route (带底部导航栏)
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return AppScaffold(navigationShell: navigationShell);
        },
        branches: [
          // 首页 Tab
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/',
                builder: (context, state) => const HomeScreen(),
              ),
            ],
          ),
          // 热力图 Tab
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/heatmap',
                builder: (context, state) => const HeatmapScreen(),
              ),
            ],
          ),
          // Git Graph Tab
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/graph',
                builder: (context, state) => const GitGraphScreen(),
              ),
            ],
          ),
          // 设置 Tab
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/settings',
                builder: (context, state) => const SettingsScreen(),
              ),
            ],
          ),
        ],
      ),
      // 仓库详情页
      GoRoute(
        path: '/repository/:id',
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          return RepositoryScreen(repositoryId: id);
        },
      ),
      // 任务详情页
      GoRoute(
        path: '/task/:id',
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          return TaskDetailScreen(taskId: id);
        },
      ),
      // 任务表单页（新建/编辑）
      GoRoute(
        path: '/task-form',
        builder: (context, state) {
          final branchId =
              state.uri.queryParameters['branchId'] ?? '';
          final taskId = state.uri.queryParameters['taskId'];
          return TaskFormScreen(
            branchId: branchId,
            taskId: taskId,
          );
        },
      ),
      // 搜索页
      GoRoute(
        path: '/search',
        builder: (context, state) => const SearchScreen(),
      ),
    ],
  );
});

/// 带底部导航栏的脚手架
class AppScaffold extends StatelessWidget {
  const AppScaffold({
    super.key,
    required this.navigationShell,
  });

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: BottomNavWidget(
        currentIndex: navigationShell.currentIndex,
        onTap: (index) {
          navigationShell.goBranch(
            index,
            initialLocation: index == navigationShell.currentIndex,
          );
        },
      ),
    );
  }
}
