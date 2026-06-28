import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';
import '../../providers/heatmap_providers.dart';
import '../../widgets/common/app_bar_widget.dart';
import '../../widgets/common/loading_widget.dart';
import '../../widgets/common/error_widget.dart';
import '../../widgets/heatmap/heatmap_calendar.dart';

/// 热力图页
class HeatmapScreen extends ConsumerWidget {
  const HeatmapScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final heatmapData = ref.watch(heatmapDataProvider);

    return Scaffold(
      appBar: const AppBarWidget(title: '贡献热力图'),
      body: heatmapData.when(
        data: (data) => _buildContent(data),
        loading: () => const LoadingWidget(message: '加载热力图...'),
        error: (error, stack) => AppErrorWidget(
          message: error.toString(),
          onRetry: () => ref.invalidate(heatmapDataProvider),
        ),
      ),
    );
  }

  Widget _buildContent(Map<DateTime, int> data) {
    // 统计信息
    final totalCompleted = data.values.fold<int>(
      0,
      (sum, count) => sum + count,
    );
    final now = DateTime.now();
    final today = data[DateTime(now.year, now.month, now.day)] ?? 0;

    // 本周统计
    final startOfWeek = now.subtract(
      Duration(days: now.weekday - 1),
    );
    var thisWeek = 0;
    for (var i = 0; i < 7; i++) {
      final day = startOfWeek.add(Duration(days: i));
      thisWeek += data[DateTime(day.year, day.month, day.day)] ?? 0;
    }

    // 连续天数
    var streak = 0;
    var checkDate = now;
    while (true) {
      final key = DateTime(
        checkDate.year,
        checkDate.month,
        checkDate.day,
      );
      if ((data[key] ?? 0) > 0) {
        streak++;
        checkDate = checkDate.subtract(
          const Duration(days: 1),
        );
      } else {
        break;
      }
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppDimensions.base),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 统计卡片
          _buildStatsRow(today, thisWeek, totalCompleted, streak),
          const SizedBox(height: AppDimensions.xl),

          // 热力图
          const Text(
            '过去一年',
            style: TextStyle(
              fontFamily: AppTypography.monoFont,
              fontSize: AppTypography.sm,
              color: AppColors.textTertiary,
            ),
          ),
          const SizedBox(height: AppDimensions.sm),
          HeatmapCalendar(data: data),
        ],
      ),
    );
  }

  Widget _buildStatsRow(
    int today,
    int thisWeek,
    int total,
    int streak,
  ) {
    return Row(
      children: [
        _StatCard(label: '今日', value: '$today'),
        const SizedBox(width: AppDimensions.sm),
        _StatCard(label: '本周', value: '$thisWeek'),
        const SizedBox(width: AppDimensions.sm),
        _StatCard(label: '总计', value: '$total'),
        const SizedBox(width: AppDimensions.sm),
        _StatCard(label: '连续', value: '${streak}天'),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(AppDimensions.md),
        decoration: BoxDecoration(
          color: AppColors.bgElevated,
          borderRadius: BorderRadius.circular(
            AppDimensions.radiusMd,
          ),
          border: Border.all(
            color: AppColors.borderSubtle,
          ),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: const TextStyle(
                fontFamily: AppTypography.monoFont,
                fontSize: AppTypography.xxl,
                fontWeight: AppTypography.bold,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(height: AppDimensions.xxs),
            Text(
              label,
              style: const TextStyle(
                fontFamily: AppTypography.bodyFont,
                fontSize: AppTypography.xs,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
