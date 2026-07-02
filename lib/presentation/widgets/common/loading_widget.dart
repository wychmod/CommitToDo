import 'package:flutter/material.dart';

import '../../../core/theme/app_theme_colors.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';

/// 加载组件
///
/// 对齐 `docs/DESIGN.md` §7.14。primary 环形进度，居中。
class LoadingWidget extends StatelessWidget {
  const LoadingWidget({
    super.key,
    this.message,
    this.size = 32,
  });

  final String? message;
  final double size;

  @override
  Widget build(BuildContext context) {
    final colors = AppThemeColors.of(context);
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: size,
            height: size,
            child: const CircularProgressIndicator(
              strokeWidth: 2.5,
              color: AppColors.primary,
            ),
          ),
          if (message != null) ...[
            const SizedBox(height: AppDimensions.md),
            Text(
              message!,
              style: AppTypography.bodySmStyle.copyWith(
                color: colors.inkMuted,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
