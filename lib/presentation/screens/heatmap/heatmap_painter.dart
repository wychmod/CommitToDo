import 'dart:ui';

import 'package:flutter/material.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';

/// 热力图绘制器
class HeatmapPainter extends CustomPainter {
  HeatmapPainter({
    required this.data,
    required this.startDate,
    required this.endDate,
    this.cellSize = AppConstants.heatmapCellSize,
    this.cellGap = AppDimensions.heatmapGap,
  });

  final Map<DateTime, int> data;
  final DateTime startDate;
  final DateTime endDate;
  final double cellSize;
  final double cellGap;

  @override
  void paint(Canvas canvas, Size size) {
    final totalCellSize = cellSize + cellGap;
    var currentDate = _startOfWeek(startDate);
    var weekIndex = 0;

    while (!currentDate.isAfter(endDate)) {
      for (var dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        final day = currentDate.add(
          Duration(days: dayOfWeek),
        );
        if (day.isAfter(endDate)) break;

        final count = data[day] ?? 0;
        final x = weekIndex * totalCellSize;
        final y = dayOfWeek * totalCellSize;

        final rect = RRect.fromRectAndRadius(
          Rect.fromLTWH(x, y, cellSize, cellSize),
          const Radius.circular(AppDimensions.radiusXs),
        );

        final paint = Paint()
          ..color = _getColorForCount(count);
        canvas.drawRRect(rect, paint);
      }

      weekIndex++;
      currentDate = currentDate.add(
        const Duration(days: 7),
      );
    }
  }

  Color _getColorForCount(int count) {
    if (count == 0) return AppColors.heatmapEmpty;
    if (count <= 2) return AppColors.heatmapLevel1;
    if (count <= 5) return AppColors.heatmapLevel2;
    if (count <= 8) return AppColors.heatmapLevel3;
    return AppColors.heatmapLevel4;
  }

  DateTime _startOfWeek(DateTime date) {
    return date.subtract(
      Duration(days: date.weekday - 1),
    );
  }

  @override
  bool shouldRepaint(covariant HeatmapPainter oldDelegate) {
    return data != oldDelegate.data;
  }
}
