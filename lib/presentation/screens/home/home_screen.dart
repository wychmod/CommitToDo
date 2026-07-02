import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme_colors.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';
import '../../widgets/common/app_bar_widget.dart';
import '../../widgets/common/app_button.dart';
import '../../widgets/common/app_dialog.dart';
import '../../widgets/common/app_input.dart';
import '../../widgets/common/app_toast.dart';
import '../../widgets/common/loading_widget.dart';
import '../../widgets/common/error_widget.dart' as err;
import '../../widgets/repository/repository_list.dart';
import 'home_notifier.dart';

/// 首页
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final homeState = ref.watch(homeNotifierProvider);
    final colors = AppThemeColors.of(context);

    return Scaffold(
      appBar: AppBarWidget(
        title: 'Commit',
        actions: [
          IconButton(
            icon: const AppIcon(AppIcons.search),
            color: colors.inkMuted,
            onPressed: () => context.push('/search'),
          ),
          IconButton(
            icon: const AppIcon(AppIcons.add),
            color: colors.inkMuted,
            onPressed: () => _showCreateDialog(context, ref),
          ),
        ],
      ),
      body: _buildBody(context, ref, homeState),
    );
  }

  Widget _buildBody(
    BuildContext context,
    WidgetRef ref,
    HomeState state,
  ) {
    if (state.isLoading) {
      return const LoadingWidget(message: '加载仓库...');
    }

    if (state.error != null) {
      return err.AppErrorWidget(
        message: state.error!,
        onRetry: () =>
            ref.read(homeNotifierProvider.notifier)
                .loadRepositories(),
      );
    }

    if (state.repositories.isEmpty) {
      return _HomeEmptyState(
        onCreate: () => _showCreateDialog(context, ref),
      );
    }

    return RefreshIndicator(
      color: AppColors.primary,
      backgroundColor: AppThemeColors.of(context).surface1,
      onRefresh: () => ref
          .read(homeNotifierProvider.notifier)
          .loadRepositories(),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(AppDimensions.md),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(
              maxWidth: AppDimensions.contentMaxWidth,
            ),
            child: RepositoryList(
              repositories: state.repositories,
              onRepositoryTap: (repo) {
                context.push('/repository/${repo.id}');
              },
              onRepositoryLongPress: (repo) =>
                  _showDeleteDialog(context, ref, repo.id),
            ),
          ),
        ),
      ),
    );
  }

  void _showCreateDialog(
    BuildContext context,
    WidgetRef ref,
  ) {
    final nameController = TextEditingController();

    AppDialog.show<void>(
      context,
      title: '创建仓库',
      content: AppInput(
        controller: nameController,
        label: '仓库名称',
        hint: '输入仓库名称...',
        autofocus: true,
      ),
      actions: [
        DialogAction(
          text: '取消',
          variant: ButtonVariant.secondary,
        ),
        DialogAction(
          text: '创建',
          onPressed: () async {
            final name = nameController.text.trim();
            if (name.isEmpty) return;

            final notifier = ref.read(
              homeNotifierProvider.notifier,
            );
            final repo = await notifier.createRepository(
              name: name,
            );

            if (repo != null && context.mounted) {
              AppToast.show(
                context,
                message: '仓库创建成功',
                variant: ToastVariant.success,
              );
              context.push('/repository/${repo.id}');
            }
          },
        ),
      ],
    );
  }

  void _showDeleteDialog(
    BuildContext context,
    WidgetRef ref,
    String repositoryId,
  ) {
    AppDialog.show<void>(
      context,
      title: '删除仓库',
      content: const Text('确定要删除这个仓库吗？此操作可以撤销。'),
      actions: [
        DialogAction(
          text: '取消',
          variant: ButtonVariant.secondary,
        ),
        DialogAction(
          text: '删除',
          variant: ButtonVariant.danger,
          onPressed: () async {
            await ref
                .read(homeNotifierProvider.notifier)
                .deleteRepository(repositoryId);
            if (context.mounted) {
              AppToast.show(
                context,
                message: '仓库已删除',
                variant: ToastVariant.info,
              );
            }
          },
        ),
      ],
    );
  }
}
class _HomeEmptyState extends StatelessWidget {
  const _HomeEmptyState({required this.onCreate});

  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) {
    final colors = AppThemeColors.of(context);
    return LayoutBuilder(
      builder: (context, constraints) {
        final isMobile = constraints.maxWidth < AppDimensions.mobileBreakpoint;
        return Center(
          child: SingleChildScrollView(
            padding: EdgeInsets.all(
              isMobile ? AppDimensions.lg : AppDimensions.xxl,
            ),
            child: Container(
              constraints: const BoxConstraints(maxWidth: 640),
              padding: EdgeInsets.all(
                isMobile ? AppDimensions.xl : AppDimensions.xxl,
              ),
              decoration: BoxDecoration(
                color: colors.canvas,
                borderRadius: BorderRadius.circular(
                  AppDimensions.radiusXxl,
                ),
                border: AppDimensions.cardBorder(color: colors.hairline),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: isMobile
                        ? AppDimensions.xxl + AppDimensions.md
                        : AppDimensions.xxl + AppDimensions.xl,
                    height: isMobile
                        ? AppDimensions.xxl + AppDimensions.md
                        : AppDimensions.xxl + AppDimensions.xl,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: AppColors.primaryGradient,
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(
                        AppDimensions.radiusXl,
                      ),
                    ),
                    child: Center(
                      child: AppIcon(
                        AppIcons.repositoryOpen,
                        size: isMobile
                            ? AppDimensions.xl
                            : AppDimensions.repositoryIconBox,
                        color: AppColors.onPrimary,
                      ),
                    ),
                  ),
                  const SizedBox(height: AppDimensions.lg),
                  ShaderMask(
                    shaderCallback: (bounds) => const LinearGradient(
                      colors: AppColors.primaryGradient,
                    ).createShader(bounds),
                    child: Text(
                      '开始你的第一个仓库',
                      style: (isMobile
                              ? AppTypography.displayMdStyle
                              : AppTypography.displayXlStyle)
                          .copyWith(color: AppColors.onPrimary),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(height: AppDimensions.sm),
                  Text(
                    '像管理代码一样管理你的任务',
                    style: AppTypography.subheadStyle.copyWith(
                      color: colors.inkMuted,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: AppDimensions.xl),
                  AppButton(
                    text: '创建仓库',
                    icon: AppIcons.add,
                    onPressed: onCreate,
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
