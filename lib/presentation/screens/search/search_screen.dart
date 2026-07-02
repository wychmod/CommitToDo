import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme_colors.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';
import '../../widgets/common/app_bar_widget.dart';
import '../../widgets/common/app_input.dart';
import '../../widgets/common/loading_widget.dart';
import '../../widgets/task/task_card.dart';
import 'search_notifier.dart';

/// 搜索页
class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _searchController = TextEditingController();
  final _focusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _focusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final searchState = ref.watch(searchNotifierProvider);
    final colors = AppThemeColors.of(context);

    return Scaffold(
      appBar: AppBarWidget(
        title: '搜索',
        showBack: true,
        actions: [
          TextButton(
            onPressed: _clearSearch,
            child: Text(
              '取消',
              style: AppTypography.buttonStyle.copyWith(
                color: colors.inkMuted,
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(AppDimensions.md),
            child: AppInput(
              controller: _searchController,
              focusNode: _focusNode,
              hint: '搜索任务...',
              prefixIcon: AppIcon(
                AppIcons.search,
                color: colors.inkSubtle,
                size: AppDimensions.iconMd,
              ),
              onChanged: (value) {
                ref.read(searchNotifierProvider.notifier).search(value);
              },
            ),
          ),
          Expanded(child: _buildBody(context, searchState)),
        ],
      ),
    );
  }

  Widget _buildBody(BuildContext context, SearchState state) {
    if (state.query.isEmpty) {
      return _buildHistory(state.history);
    }

    if (state.isLoading) {
      return const LoadingWidget();
    }

    if (state.results.isEmpty) {
      return _SearchEmptyState(query: state.query);
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(
        AppDimensions.md,
        0,
        AppDimensions.md,
        AppDimensions.md,
      ),
      itemCount: state.results.length,
      separatorBuilder: (_, __) => const SizedBox(height: AppDimensions.xs),
      itemBuilder: (context, index) {
        final task = state.results[index];
        return TaskCard(
          task: task,
          onTap: () => context.push('/task/${task.id}'),
        );
      },
    );
  }

  Widget _buildHistory(List<String> history) {
    if (history.isEmpty) {
      return const _SearchIdleState();
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(
        AppDimensions.md,
        0,
        AppDimensions.md,
        AppDimensions.md,
      ),
      itemCount: history.length + 1,
      separatorBuilder: (_, __) =>
          Divider(color: AppThemeColors.of(context).hairline),
      itemBuilder: (context, index) {
        if (index == 0) {
          return _HistoryHeader(onClear: () {
            ref.read(searchNotifierProvider.notifier).clearHistory();
          });
        }

        final term = history[index - 1];
        return _HistoryRow(
          term: term,
          onTap: () {
            _searchController.text = term;
            ref.read(searchNotifierProvider.notifier).search(term);
          },
        );
      },
    );
  }

  void _clearSearch() {
    ref.read(searchNotifierProvider.notifier).clearResults();
    _searchController.clear();
    _focusNode.requestFocus();
  }
}

class _HistoryHeader extends StatelessWidget {
  const _HistoryHeader({required this.onClear});

  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    final colors = AppThemeColors.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: AppDimensions.xs),
      child: Row(
        children: [
          Text(
            '最近搜索',
            style: AppTypography.eyebrowStyle.copyWith(
              color: colors.inkSubtle,
            ),
          ),
          const Spacer(),
          Semantics(
            button: true,
            label: '清除搜索历史',
            child: InkWell(
              onTap: onClear,
              borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppDimensions.xs,
                  vertical: AppDimensions.xxs,
                ),
                child: Text(
                  '清除',
                  style: AppTypography.buttonStyle.copyWith(
                    color: AppColors.primary,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _HistoryRow extends StatelessWidget {
  const _HistoryRow({
    required this.term,
    required this.onTap,
  });

  final String term;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = AppThemeColors.of(context);
    return Semantics(
      button: true,
      label: '搜索 $term',
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppDimensions.radiusXs),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: AppDimensions.md),
          child: Row(
            children: [
              const AppIcon(
                AppIcons.gitCommit,
                size: AppDimensions.iconSm,
                color: AppColors.primary,
              ),
              const SizedBox(width: AppDimensions.md),
              Expanded(
                child: Text(
                  term,
                  style: AppTypography.bodyStyle.copyWith(
                    color: colors.ink,
                  ),
                ),
              ),
              Text(
                'history',
                style: AppTypography.monoSmStyle.copyWith(
                  color: colors.inkSubtle,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SearchIdleState extends StatelessWidget {
  const _SearchIdleState();

  @override
  Widget build(BuildContext context) {
    final colors = AppThemeColors.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppDimensions.xxl),
        child: Text(
          '输入关键词搜索任务',
          style: AppTypography.bodyStyle.copyWith(
            color: colors.inkSubtle,
          ),
        ),
      ),
    );
  }
}

class _SearchEmptyState extends StatelessWidget {
  const _SearchEmptyState({required this.query});

  final String query;

  @override
  Widget build(BuildContext context) {
    final colors = AppThemeColors.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppDimensions.xxl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppIcon(
              AppIcons.search,
              size: AppDimensions.xxl,
              color: colors.inkSubtle,
            ),
            const SizedBox(height: AppDimensions.md),
            Text(
              '未找到匹配的任务',
              style: AppTypography.cardTitleStyle.copyWith(
                color: colors.ink,
              ),
            ),
            const SizedBox(height: AppDimensions.xs),
            Text(
              query,
              style: AppTypography.monoSmStyle.copyWith(
                color: colors.inkSubtle,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
