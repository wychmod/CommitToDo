import 'package:flutter/material.dart';

import '../../../core/theme/app_theme_colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';
import '../../../domain/entities/branch.dart';
import 'branch_indicator.dart';

/// 分支列表
class BranchList extends StatelessWidget {
  const BranchList({
    super.key,
    required this.branches,
    this.activeBranchId,
    this.onBranchTap,
    this.onBranchLongPress,
    this.scrollDirection = Axis.horizontal,
  });

  final List<Branch> branches;
  final String? activeBranchId;
  final ValueChanged<Branch>? onBranchTap;
  final ValueChanged<Branch>? onBranchLongPress;
  final Axis scrollDirection;

  @override
  Widget build(BuildContext context) {
    final colors = AppThemeColors.of(context);
    if (branches.isEmpty) {
      return Center(
        child: Text(
          '暂无分支',
          style: AppTypography.bodySmStyle.copyWith(
            color: colors.inkSubtle,
          ),
        ),
      );
    }

    return SizedBox(
      height: scrollDirection == Axis.horizontal
          ? AppDimensions.tapTargetMin
          : null,
      child: ListView.separated(
        scrollDirection: scrollDirection,
        shrinkWrap: scrollDirection == Axis.vertical,
        physics: const BouncingScrollPhysics(),
        itemCount: branches.length,
        separatorBuilder: (_, __) => SizedBox(
          width: AppDimensions.xs,
          height: AppDimensions.xs,
        ),
        itemBuilder: (context, index) {
          final branch = branches[index];
          return BranchIndicator(
            branch: branch,
            colorIndex: index,
            isActive: branch.id == activeBranchId,
            onTap: () => onBranchTap?.call(branch),
          );
        },
      ),
    );
  }
}
