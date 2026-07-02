import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme_colors.dart';
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
    final colors = AppThemeColors.of(context);
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
      padding: const EdgeInsets.all(AppDimensions.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 展示面标题
          ShaderMask(
            shaderCallback: (bounds) => const LinearGradient(
              colors: AppColors.primaryGradient,
            ).createShader(bounds),
            child: Text(
              '贡献热力图',
              style: AppTypography.displayMdStyle.copyWith(
                color: AppColors.onPrimary,
              ),
            ),
          ),
          const SizedBox(height: AppDimensions.xl),

          // 统计卡片
          _buildStatsRow(today, thisWeek, totalCompleted, streak),
          const SizedBox(height: AppDimensions.xl),

          // 热力图
          Text(
            '过去一年',
            style: AppTypography.eyebrowStyle.copyWith(
              color: colors.inkSubtle,
            ),
          ),
          const SizedBox(height: AppDimensions.xs),
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
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = constraints.maxWidth >= AppDimensions.mobileBreakpoint
            ? 4
            : 2;
        final width = (constraints.maxWidth -
                AppDimensions.sm * (columns - 1)) /
            columns;

        return Wrap(
          spacing: AppDimensions.sm,
          runSpacing: AppDimensions.sm,
          children: [
            _StatCard(label: '今日', value: '$today', width: width),
            _StatCard(label: '本周', value: '$thisWeek', width: width),
            _StatCard(label: '总计', value: '$total', width: width),
            _StatCard(label: '连续', value: '${streak}天', width: width),
          ],
        );
      },
    );
  }
}
class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.width,
  });

  final String label;
  final String value;
  final double width;

  @override
  Widget build(BuildContext context) {
    final colors = AppThemeColors.of(context);
    return SizedBox(
      width: width,
      child: Container(
        padding: const EdgeInsets.all(AppDimensions.md),
        decoration: BoxDecoration(
          color: colors.surface1,
          borderRadius: BorderRadius.circular(AppDimensions.radiusLg),
          border: Border.all(color: colors.hairline, width: 1),
        ),
        child: Column(
          children: [
            ShaderMask(
              shaderCallback: (bounds) => const LinearGradient(
                colors: AppColors.primaryGradient,
              ).createShader(bounds),
              child: Text(
                value,
                style: AppTypography.displayMdStyle.copyWith(
                  color: AppColors.onPrimary,
                  fontWeight: AppTypography.bold,
                ),
              ),
            ),
            const SizedBox(height: AppDimensions.xxs),
            Text(
              label,
              style: AppTypography.captionStyle.copyWith(
                color: colors.inkMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
