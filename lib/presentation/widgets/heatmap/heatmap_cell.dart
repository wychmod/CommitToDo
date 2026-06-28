import 'package:flutter/material.dart';

import '../../../core/theme/colors.dart';

/// 热力图单元格
class HeatmapCell extends StatelessWidget {
  const HeatmapCell({
    super.key,
    required this.count,
    this.size = 14.0,
  });

  final int count;
  final double size;

  Color get _color {
    if (count == 0) return AppColors.heatmapEmpty;
    if (count <= 2) return AppColors.heatmapLevel1;
    if (count <= 5) return AppColors.heatmapLevel2;
    if (count <= 8) return AppColors.heatmapLevel3;
    return AppColors.heatmapLevel4;
  }

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: count > 0 ? '$count 个任务完成' : '无数据',
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: _color,
          borderRadius: BorderRadius.circular(3),
        ),
      ),
    );
  }
}
