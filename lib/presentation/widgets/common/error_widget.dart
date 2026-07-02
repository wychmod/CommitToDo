import 'package:flutter/material.dart';

import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme_colors.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';
import 'app_button.dart';

/// 错误组件
///
/// 对齐 `docs/DESIGN.md` §7.14。error 色图标 + body 文案 + button-secondary 重试。
class AppErrorWidget extends StatelessWidget {
  const AppErrorWidget({
    super.key,
    required this.message,
    this.onRetry,
  });

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final colors = AppThemeColors.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppDimensions.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const AppIcon(
              AppIcons.error,
              size: AppDimensions.xxl,
              color: AppColors.error,
            ),
            const SizedBox(height: AppDimensions.md),
            Text(
              '出错了',
              style: AppTypography.headlineStyle.copyWith(
                fontSize: AppTypography.cardTitle,
              ),
            ),
            const SizedBox(height: AppDimensions.sm),
            Text(
              message,
              textAlign: TextAlign.center,
              style: AppTypography.bodySmStyle.copyWith(
                color: colors.inkMuted,
              ),
            ),
            if (onRetry != null) ...[
              const SizedBox(height: AppDimensions.lg),
              AppButton(
                text: '重试',
                onPressed: onRetry,
                variant: ButtonVariant.secondary,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
