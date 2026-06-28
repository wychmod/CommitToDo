import 'package:flutter/material.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';
import 'heatmap_cell.dart';

/// 热力图日历
class HeatmapCalendar extends StatelessWidget {
  const HeatmapCalendar({
    super.key,
    required this.data,
    this.startDate,
    this.endDate,
    this.cellSize = 14.0,
    this.cellGap = 3.0,
  });

  /// 数据: {日期 -> 完成任务数}
  final Map<DateTime, int> data;
  final DateTime? startDate;
  final DateTime? endDate;
  final double cellSize;
  final double cellGap;

  @override
  Widget build(BuildContext context) {
    final end = endDate ?? DateTime.now();
    final start = startDate ??
        end.subtract(
          const Duration(days: AppConstants.heatmapWeeks * 7),
        );

    // 计算每周的起始日期（周一为一周起始）
    final weeks = <List<_DayData>>[];
    var currentDate = _startOfWeek(start);
    while (currentDate.isBefore(end) ||
        currentDate.isAtSameMomentAs(end)) {
      final week = <_DayData>[];
      for (var i = 0; i < 7; i++) {
        final day = currentDate.add(Duration(days: i));
        if (day.isAfter(end)) break;
        week.add(_DayData(
          date: day,
          count: data[day] ?? 0,
        ));
      }
      if (week.isNotEmpty) weeks.add(week);
      currentDate = currentDate.add(const Duration(days: 7));
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 星期标签 + 热力图
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 星期标签
            Column(
              children: [
                for (final label in ['一', '二', '三', '四', '五', '六', '日'])
                  SizedBox(
                    height: cellSize + cellGap,
                    width: 24,
                    child: Center(
                      child: Text(
                        label,
                        style: const TextStyle(
                          fontFamily: AppTypography.monoFont,
                          fontSize: 10,
                          color: AppColors.textTertiary,
                        ),
                      ),
                    ),
                  ),
              ],
            ),

            const SizedBox(width: AppDimensions.xs),

            // 热力图网格
            Expanded(
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                reverse: true,
                child: Row(
                  crossAxisAlignment:
                      CrossAxisAlignment.start,
                  children: [
                    for (final week in weeks) ...[
                      Column(
                        children: [
                          for (final day in week)
                            Padding(
                              padding: EdgeInsets.only(
                                bottom: cellGap,
                              ),
                              child: HeatmapCell(
                                count: day.count,
                                size: cellSize,
                              ),
                            ),
                          // 补齐不足7天的行
                          for (var i = week.length;
                              i < 7;
                              i++)
                            SizedBox(
                              width: cellSize,
                              height: cellSize + cellGap,
                            ),
                        ],
                      ),
                      SizedBox(width: cellGap),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),

        // 图例
        const SizedBox(height: AppDimensions.sm),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text(
              '少',
              style: TextStyle(
                fontSize: 10,
                color: AppColors.textTertiary,
              ),
            ),
            const SizedBox(width: AppDimensions.xs),
            for (final color in [
              AppColors.heatmapEmpty,
              AppColors.heatmapLevel1,
              AppColors.heatmapLevel2,
              AppColors.heatmapLevel3,
              AppColors.heatmapLevel4,
            ])
              Container(
                width: 10,
                height: 10,
                margin: const EdgeInsets.symmetric(
                  horizontal: 1,
                ),
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            const SizedBox(width: AppDimensions.xs),
            const Text(
              '多',
              style: TextStyle(
                fontSize: 10,
                color: AppColors.textTertiary,
              ),
            ),
          ],
        ),
      ],
    );
  }

  /// 获取周一
  DateTime _startOfWeek(DateTime date) {
    return date.subtract(Duration(days: date.weekday - 1));
  }
}

class _DayData {
  const _DayData({required this.date, required this.count});

  final DateTime date;
  final int count;
}
