import 'package:flutter/material.dart';

import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme_colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';
import 'app_button.dart';

/// Hero Empty State（展示面）
///
/// 对齐 `docs/DESIGN.md` §13.1。
/// - 容器：canvas 底、`radiusXxl`(24)、padding 48、1px hairline。
/// - 图标：渐变背景装饰盒（`primaryGradient`）。
/// - 标题：渐变 `displayXl`（移动端 `displayMd`）。
/// - 副标题：`subhead` / `bodySm` + `inkMuted`。
/// - 可选主 CTA。
class HeroEmptyState extends StatelessWidget {
  const HeroEmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.actionText,
    this.onAction,
    this.semanticLabel,
  });

  final AppIconName icon;
  final String title;
  final String? subtitle;
  final String? actionText;
  final VoidCallback? onAction;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final colors = AppThemeColors.of(context);
    final isMobile = MediaQuery.sizeOf(context).width <
        AppDimensions.mobileBreakpoint;

    return Semantics(
      label: semanticLabel ??
          '$title${subtitle != null ? '，$subtitle' : ''}',
      child: Center(
        child: SingleChildScrollView(
          padding: EdgeInsets.all(
            isMobile ? AppDimensions.lg : AppDimensions.xxl,
          ),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 640),
            padding: EdgeInsets.all(
              isMobile ? AppDimensions.xl : AppDimensions.xxl,
            ),
            decoration: BoxDecoration(
              color: colors.canvas,
              borderRadius: BorderRadius.circular(
                AppDimensions.radiusXxl,
              ),
              border: Border.all(color: colors.hairline),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _IconBox(icon: icon, isMobile: isMobile),
                const SizedBox(height: AppDimensions.lg),
                _GradientTitle(
                  title: title,
                  isMobile: isMobile,
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: AppDimensions.sm),
                  Text(
                    subtitle!,
                    style: AppTypography.subheadStyle.copyWith(
                      color: colors.inkMuted,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
                if (actionText != null && onAction != null) ...[
                  const SizedBox(height: AppDimensions.xl),
                  AppButton(
                    text: actionText!,
                    icon: AppIcons.add,
                    onPressed: onAction,
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _IconBox extends StatelessWidget {
  const _IconBox({required this.icon, required this.isMobile});

  final AppIconName icon;
  final bool isMobile;

  @override
  Widget build(BuildContext context) {
    final colors = AppThemeColors.of(context);
    final size = isMobile
        ? AppDimensions.xxl + AppDimensions.md
        : AppDimensions.xxl + AppDimensions.xl;
    final iconSize = isMobile
        ? AppDimensions.xl
        : AppDimensions.repositoryIconBox;

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: colors.primaryGradient,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(AppDimensions.radiusXl),
      ),
      child: Center(
        child: AppIcon(
          icon,
          size: iconSize,
          color: colors.onPrimary,
        ),
      ),
    );
  }
}

class _GradientTitle extends StatelessWidget {
  const _GradientTitle({required this.title, required this.isMobile});

  final String title;
  final bool isMobile;

  @override
  Widget build(BuildContext context) {
    final colors = AppThemeColors.of(context);
    return ShaderMask(
      shaderCallback: (bounds) => LinearGradient(
        colors: colors.primaryGradient,
      ).createShader(bounds),
      child: Text(
        title,
        style: (isMobile
                ? AppTypography.displayMdStyle
                : AppTypography.displayXlStyle)
            .copyWith(color: colors.onPrimary),
        textAlign: TextAlign.center,
      ),
    );
  }
}
