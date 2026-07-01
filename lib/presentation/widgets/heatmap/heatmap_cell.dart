import 'package:flutter/material.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';

/// 热力图单元格
///
/// 对齐 `docs/DESIGN.md` §7.7。
/// - heatmap-* 色阶、`radiusXs`(4)、gap 3。
/// - hover → 1px hairlineStrong 边框（Tooltip 自带高亮）。
class HeatmapCell extends StatefulWidget {
  const HeatmapCell({
    super.key,
    required this.count,
    this.size = AppConstants.heatmapCellSize,
  });

  final int count;
  final double size;

  @override
  State<HeatmapCell> createState() => _HeatmapCellState();
}

class _HeatmapCellState extends State<HeatmapCell> {
  bool _hovering = false;

  Color get _color {
    if (widget.count == 0) return AppColors.heatmapEmpty;
    if (widget.count <= 2) return AppColors.heatmapLevel1;
    if (widget.count <= 5) return AppColors.heatmapLevel2;
    if (widget.count <= 8) return AppColors.heatmapLevel3;
    return AppColors.heatmapLevel4;
  }

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: widget.count > 0 ? '${widget.count} 个任务完成' : '无数据',
      decoration: BoxDecoration(
        color: AppColors.surface3,
        borderRadius: BorderRadius.circular(AppDimensions.radiusXs),
      ),
      textStyle: AppTypography.captionStyle.copyWith(
        color: AppColors.ink,
      ),
      child: MouseRegion(
        onEnter: (_) => setState(() => _hovering = true),
        onExit: (_) => setState(() => _hovering = false),
        child: AnimatedContainer(
          duration: AppDimensions.animFast,
          width: widget.size,
          height: widget.size,
          decoration: BoxDecoration(
            color: _color,
            borderRadius: BorderRadius.circular(AppDimensions.radiusXs),
            border: Border.all(
              color: _hovering
                  ? AppColors.hairlineStrong
                  : AppColors.hairline,
              width: _hovering ? 1 : 0.5,
            ),
          ),
        ),
      ),
    );
  }
}
