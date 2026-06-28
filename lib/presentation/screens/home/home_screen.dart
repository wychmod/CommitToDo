import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_icons.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';
import '../../widgets/common/app_bar_widget.dart';
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

    return Scaffold(
      appBar: AppBarWidget(
        title: 'Commit',
        actions: [
          IconButton(
            icon: const AppIcon(AppIcons.search),
            color: AppColors.textSecondary,
            onPressed: () => context.push('/search'),
          ),
          IconButton(
            icon: const AppIcon(AppIcons.add),
            color: AppColors.textSecondary,
            onPressed: () =>
                _showCreateDialog(context, ref),
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
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const AppIcon(
              AppIcons.repositoryOpen,
              size: 64,
              color: AppColors.textTertiary,
            ),
            const SizedBox(height: AppDimensions.base),
            const Text(
              '开始你的第一个仓库',
              style: TextStyle(
                fontFamily: AppTypography.headingFont,
                fontSize: AppTypography.xl,
                fontWeight: AppTypography.semiBold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: AppDimensions.sm),
            const Text(
              '像管理代码一样管理你的任务',
              style: TextStyle(
                fontSize: AppTypography.sm,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: AppDimensions.xl),
            ElevatedButton.icon(
              onPressed: () =>
                  _showCreateDialog(context, ref),
              icon: const AppIcon(AppIcons.add),
              label: const Text('创建仓库'),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () => ref
          .read(homeNotifierProvider.notifier)
          .loadRepositories(),
      child: Padding(
        padding: const EdgeInsets.all(AppDimensions.base),
        child: RepositoryList(
          repositories: state.repositories,
          onRepositoryTap: (repo) {
            context.push('/repository/${repo.id}');
          },
          onRepositoryLongPress: (repo) =>
              _showDeleteDialog(context, ref, repo.id),
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
