import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_icons.dart';
import '../../core/theme/colors.dart';
import '../../core/theme/dimensions.dart';
import '../../core/theme/typography.dart';
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

  static const double _desktopBreakpoint = 840;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isDesktop = constraints.maxWidth >= _desktopBreakpoint;
        if (isDesktop) {
          // 桌面端：侧边导航 + 主内容区
          return Scaffold(
            body: Row(
              children: [
                _SideNav(
                  currentIndex: navigationShell.currentIndex,
                  onTap: (index) {
                    navigationShell.goBranch(
                      index,
                      initialLocation:
                          index == navigationShell.currentIndex,
                    );
                  },
                ),
                const VerticalDivider(
                  width: 1,
                  color: AppColors.borderSubtle,
                ),
                Expanded(child: navigationShell),
              ],
            ),
          );
        }

        // 移动端：底部导航
        return Scaffold(
          body: navigationShell,
          bottomNavigationBar: BottomNavWidget(
            currentIndex: navigationShell.currentIndex,
            onTap: (index) {
              navigationShell.goBranch(
                index,
                initialLocation:
                    index == navigationShell.currentIndex,
              );
            },
          ),
        );
      },
    );
  }
}

/// 桌面端侧边导航
class _SideNav extends StatelessWidget {
  const _SideNav({
    required this.currentIndex,
    required this.onTap,
  });

  final int currentIndex;
  final ValueChanged<int> onTap;

  static const _items = [
    (AppIconName.repository, '仓库'),
    (AppIconName.heatmap, '热力图'),
    (AppIconName.graph, '图形'),
    (AppIconName.settings, '设置'),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 200,
      color: AppColors.bgBase,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Padding(
              padding: EdgeInsets.all(AppDimensions.lg),
              child: Text(
                'Commit',
                style: TextStyle(
                  fontFamily: AppTypography.headingFont,
                  fontSize: AppTypography.xl,
                  fontWeight: AppTypography.semiBold,
                  color: AppColors.textPrimary,
                ),
              ),
            ),
            for (var i = 0; i < _items.length; i++)
              _SideNavItem(
                icon: _items[i].$1,
                label: _items[i].$2,
                isActive: currentIndex == i,
                onTap: () => onTap(i),
              ),
          ],
        ),
      ),
    );
  }
}

class _SideNavItem extends StatelessWidget {
  const _SideNavItem({
    required this.icon,
    required this.label,
    required this.isActive,
    required this.onTap,
  });

  final AppIconName icon;
  final String label;
  final bool isActive;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = isActive ? AppColors.primary : AppColors.textSecondary;
    return Semantics(
      button: true,
      selected: isActive,
      label: label,
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AppDimensions.lg,
            vertical: AppDimensions.md,
          ),
          decoration: BoxDecoration(
            border: Border(
              left: BorderSide(
                width: 3,
                color: isActive ? AppColors.primary : Colors.transparent,
              ),
            ),
          ),
          child: Row(
            children: [
              AppIcon(icon, size: 20, color: color),
              const SizedBox(width: AppDimensions.md),
              Text(
                label,
                style: TextStyle(
                  fontFamily: AppTypography.bodyFont,
                  fontSize: AppTypography.base,
                  fontWeight: isActive
                      ? AppTypography.medium
                      : AppTypography.regular,
                  color: color,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
