import 'package:flutter/material.dart';

import '../../../core/theme/app_icons.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';

/// 按钮变体
enum ButtonVariant {
  primary,
  secondary,
  ghost,
  danger,
}

/// 按钮尺寸
enum ButtonSize {
  sm,
  md,
  lg,
}

/// 通用按钮
class AppButton extends StatelessWidget {
  const AppButton({
    super.key,
    required this.text,
    this.onPressed,
    this.variant = ButtonVariant.primary,
    this.size = ButtonSize.md,
    this.icon,
    this.isLoading = false,
    this.isExpanded = false,
  });

  final String text;
  final VoidCallback? onPressed;
  final ButtonVariant variant;
  final ButtonSize size;
  final AppIconName? icon;
  final bool isLoading;
  final bool isExpanded;

  double get _height {
    return switch (size) {
      ButtonSize.sm => 32.0,
      ButtonSize.md => 40.0,
      ButtonSize.lg => 48.0,
    };
  }

  double get _fontSize {
    return switch (size) {
      ButtonSize.sm => AppTypography.sm,
      ButtonSize.md => AppTypography.base,
      ButtonSize.lg => AppTypography.lg,
    };
  }

  Color get _backgroundColor {
    return switch (variant) {
      ButtonVariant.primary => AppColors.primary,
      ButtonVariant.secondary => Colors.transparent,
      ButtonVariant.ghost => Colors.transparent,
      ButtonVariant.danger => AppColors.error,
    };
  }

  Color get _foregroundColor {
    return switch (variant) {
      ButtonVariant.primary => AppColors.textPrimary,
      ButtonVariant.secondary => AppColors.textPrimary,
      ButtonVariant.ghost => AppColors.textSecondary,
      ButtonVariant.danger => AppColors.textPrimary,
    };
  }

  BorderSide get _borderSide {
    return switch (variant) {
      ButtonVariant.secondary =>
        const BorderSide(color: AppColors.borderDefault),
      _ => BorderSide.none,
    };
  }

  @override
  Widget build(BuildContext context) {
    final isDisabled = onPressed == null || isLoading;

    return SizedBox(
      height: _height,
      width: isExpanded ? double.infinity : null,
      child: TextButton(
        onPressed: isDisabled ? null : onPressed,
        style: TextButton.styleFrom(
          backgroundColor: isDisabled
              ? _backgroundColor.withAlpha(128)
              : _backgroundColor,
          foregroundColor: _foregroundColor,
          side: _borderSide,
          shape: RoundedRectangleBorder(
            borderRadius:
                BorderRadius.circular(AppDimensions.radiusMd),
          ),
          padding: EdgeInsets.symmetric(
            horizontal: size == ButtonSize.sm ? 12 : 16,
          ),
        ),
        child: isLoading
            ? SizedBox(
                width: _fontSize,
                height: _fontSize,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: _foregroundColor,
                ),
              )
            : Row(
                mainAxisSize: MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (icon != null) ...[
                    AppIcon(
                      icon!,
                      size: _fontSize + 2,
                      color: _foregroundColor,
                    ),
                    const SizedBox(width: AppDimensions.sm),
                  ],
                  Text(
                    text,
                    style: TextStyle(
                      fontFamily: AppTypography.bodyFont,
                      fontSize: _fontSize,
                      fontWeight: AppTypography.medium,
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
