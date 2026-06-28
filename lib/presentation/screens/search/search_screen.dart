import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_icons.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';
import '../../widgets/common/app_bar_widget.dart';
import '../../widgets/common/loading_widget.dart';
import 'search_notifier.dart';

/// 搜索页
class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() =>
      _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _searchController = TextEditingController();
  final _focusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    _focusNode.requestFocus();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final searchState =
        ref.watch(searchNotifierProvider);

    return Scaffold(
      appBar: AppBarWidget(
        title: '',
        showBack: true,
        actions: [
          TextButton(
            onPressed: () {
              ref
                  .read(searchNotifierProvider.notifier)
                  .clearResults();
              _searchController.clear();
            },
            child: const Text(
              '取消',
              style: TextStyle(
                color: AppColors.textSecondary,
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // 搜索输入框
          Padding(
            padding: const EdgeInsets.all(
              AppDimensions.base,
            ),
            child: TextField(
              controller: _searchController,
              focusNode: _focusNode,
              onChanged: (value) {
                ref
                    .read(searchNotifierProvider.notifier)
                    .search(value);
              },
              style: const TextStyle(
                fontFamily: AppTypography.bodyFont,
                fontSize: AppTypography.base,
                color: AppColors.textPrimary,
              ),
              decoration: InputDecoration(
                hintText: '搜索任务...',
                hintStyle: const TextStyle(
                  color: AppColors.textTertiary,
                ),
                prefixIcon: const AppIcon(
                  AppIcons.search,
                  color: AppColors.textTertiary,
                  size: 20,
                ),
                filled: true,
                fillColor: AppColors.bgOverlay,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(
                    AppDimensions.radiusFull,
                  ),
                  borderSide: BorderSide.none,
                ),
                contentPadding:
                    const EdgeInsets.symmetric(
                  horizontal: AppDimensions.base,
                  vertical: AppDimensions.md,
                ),
              ),
            ),
          ),

          // 搜索历史
          if (searchState.query.isEmpty &&
              searchState.history.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppDimensions.base,
              ),
              child: Row(
                mainAxisAlignment:
                    MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    '最近搜索',
                    style: TextStyle(
                      fontFamily: AppTypography.monoFont,
                      fontSize: AppTypography.sm,
                      color: AppColors.textTertiary,
                    ),
                  ),
                  Semantics(
                    button: true,
                    label: '清除搜索历史',
                    child: InkWell(
                      onTap: () => ref
                          .read(searchNotifierProvider
                              .notifier)
                          .clearHistory(),
                      borderRadius: BorderRadius.circular(
                        AppDimensions.radiusSm,
                      ),
                      child: const Padding(
                        padding: EdgeInsets.all(4),
                        child: Text(
                          '清除',
                          style: TextStyle(
                            fontSize: AppTypography.sm,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppDimensions.sm),
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppDimensions.base,
              ),
              child: Wrap(
                spacing: AppDimensions.sm,
                runSpacing: AppDimensions.sm,
                children: [
                  for (final term in searchState.history)
                    Semantics(
                      button: true,
                      label: '搜索 $term',
                      child: InkWell(
                        onTap: () {
                          _searchController.text = term;
                          ref
                              .read(searchNotifierProvider
                                  .notifier)
                              .search(term);
                        },
                        borderRadius: BorderRadius.circular(
                          AppDimensions.radiusFull,
                        ),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppDimensions.md,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.bgElevated,
                            borderRadius:
                                BorderRadius.circular(
                              AppDimensions.radiusFull,
                            ),
                          ),
                          child: Text(
                            term,
                            style: const TextStyle(
                              fontSize: AppTypography.sm,
                              color:
                                  AppColors.textSecondary,
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],

          // 搜索结果
          if (searchState.query.isNotEmpty) ...[
            if (searchState.isLoading)
              const Expanded(
                child: LoadingWidget(),
              )
            else if (searchState.results.isEmpty)
              const Expanded(
                child: Center(
                  child: Text(
                    '未找到匹配的任务',
                    style: TextStyle(
                      color: AppColors.textTertiary,
                    ),
                  ),
                ),
              )
            else
              Expanded(
                child: ListView.separated(
                  padding: const EdgeInsets.all(
                    AppDimensions.base,
                  ),
                  itemCount: searchState.results.length,
                  separatorBuilder: (_, __) =>
                      const SizedBox(
                    height: AppDimensions.sm,
                  ),
                  itemBuilder: (context, index) {
                    final task =
                        searchState.results[index];
                    return Semantics(
                      button: true,
                      label: '打开任务 ${task.title}',
                      child: InkWell(
                        onTap: () =>
                            context.push('/task/${task.id}'),
                        borderRadius: BorderRadius.circular(
                          AppDimensions.radiusMd,
                        ),
                        child: Container(
                          padding: const EdgeInsets.all(
                            AppDimensions.md,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.bgElevated,
                            borderRadius:
                                BorderRadius.circular(
                              AppDimensions.radiusMd,
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment:
                                CrossAxisAlignment.start,
                            children: [
                              Text(
                                task.title,
                                style: const TextStyle(
                                  fontSize:
                                      AppTypography.base,
                                  fontWeight:
                                      AppTypography.medium,
                                  color:
                                      AppColors.textPrimary,
                                ),
                              ),
                              if (task.description !=
                                  null) ...[
                                const SizedBox(
                                  height:
                                      AppDimensions.xs,
                                ),
                                Text(
                                  task.description!,
                                  maxLines: 2,
                                  overflow:
                                      TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize:
                                        AppTypography.sm,
                                    color: AppColors
                                        .textSecondary,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
          ],
        ],
      ),
    );
  }
}
