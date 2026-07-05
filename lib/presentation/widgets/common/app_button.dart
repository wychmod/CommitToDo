import 'package:flutter/material.dart';

import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme_colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';

/// 按钮变体（DESIGN.md §7.1）
enum ButtonVariant {
  primary,
  secondary,
  tertiary,
  danger,
  inverse,
}

/// 按钮尺寸
enum ButtonSize {
  sm,
  md,
  lg,
}

/// 通用按钮
///
/// 对齐 `docs/DESIGN.md` §7.1。
/// - CTA 用 `radiusMd`(8)，绝不 pill。
/// - 三态：default → hover(primary-hover) → pressed(primary-focus) → focused(2px ring @ 50%)。
/// - 全部 Semantics + InkWell。
class AppButton extends StatefulWidget {
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

  @override
  State<AppButton> createState() => _AppButtonState();
}

class _AppButtonState extends State<AppButton> {
  bool _hovering = false;
  bool _pressing = false;
  bool _focused = false;

  double get _height {
    return switch (widget.size) {
      ButtonSize.sm => AppDimensions.ctaHeightSm,
      ButtonSize.md => AppDimensions.ctaHeight,
      ButtonSize.lg => AppDimensions.ctaHeightLg,
    };
  }

  double get _fontSize {
    return switch (widget.size) {
      ButtonSize.sm => AppTypography.bodySm,
      ButtonSize.md => AppTypography.button,
      ButtonSize.lg => AppTypography.bodyLg,
    };
  }

  double get _iconSize => _fontSize + 2;

  Color _backgroundColor(BuildContext context) {
    final colors = AppThemeColors.of(context);
    final v = widget.variant;
    switch (v) {
      case ButtonVariant.primary:
        if (_pressing) return colors.primaryFocus;
        if (_hovering) return colors.primaryHover;
        return colors.primary;
      case ButtonVariant.secondary:
        if (_hovering) return colors.surface2;
        return colors.surface1;
      case ButtonVariant.tertiary:
        return colors.canvas;
      case ButtonVariant.danger:
        if (_hovering) return colors.errorLight;
        return colors.error;
      case ButtonVariant.inverse:
        if (_hovering) return colors.surface2;
        return colors.inverseCanvas;
    }
  }

  Color _foregroundColor(BuildContext context) {
    final colors = AppThemeColors.of(context);
    switch (widget.variant) {
      case ButtonVariant.primary:
      case ButtonVariant.danger:
        return colors.onPrimary;
      case ButtonVariant.secondary:
      case ButtonVariant.tertiary:
        return colors.ink;
      case ButtonVariant.inverse:
        return colors.inverseInk;
    }
  }

  Color? _borderColor(BuildContext context) {
    final colors = AppThemeColors.of(context);
    switch (widget.variant) {
      case ButtonVariant.secondary:
        return colors.hairline;
      case ButtonVariant.primary:
      case ButtonVariant.tertiary:
      case ButtonVariant.danger:
      case ButtonVariant.inverse:
        return null;
    }
  }

  BorderSide? _borderSide(BuildContext context) {
    final c = _borderColor(context);
    return c == null ? BorderSide.none : BorderSide(color: c);
  }

  @override
  Widget build(BuildContext context) {
    final isDisabled = widget.onPressed == null || widget.isLoading;
    final bg = _backgroundColor(context);
    final fg = _foregroundColor(context);

    return Semantics(
      button: true,
      enabled: !isDisabled,
      label: widget.text,
      child: MouseRegion(
        cursor: isDisabled
            ? SystemMouseCursors.forbidden
            : SystemMouseCursors.click,
        child: AnimatedContainer(
          duration: AppDimensions.animFast,
          curve: AppDimensions.easeOutQuart,
          height: _height,
          constraints: BoxConstraints(
            minWidth: widget.isExpanded ? double.infinity : 0,
          ),
          decoration: BoxDecoration(
            color: isDisabled ? bg.withAlpha(80) : bg,
            borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
            border: Border.fromBorderSide(_borderSide(context)),
            boxShadow: _focused && !isDisabled
                ? [
                    BoxShadow(
                      color: colors.primaryFocus.withAlpha(128),
                      blurRadius: 0,
                      spreadRadius: 2,
                    ),
                  ]
                : null,
          ),
          constraints: const BoxConstraints(
            minHeight: AppDimensions.tapTargetMin,
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: isDisabled ? null : widget.onPressed,
              onHover: (value) => setState(() => _hovering = value),
              onHighlightChanged: (value) {
                setState(() => _pressing = value);
              },
              onFocusChange: (value) => setState(() => _focused = value),
              borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppDimensions.ctaPaddingHorizontal,
                ),
                child: Center(
                  widthFactor: widget.isExpanded ? null : 1,
                  child: widget.isLoading
                      ? SizedBox(
                          width: _fontSize,
                          height: _fontSize,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: fg,
                          ),
                        )
                      : Row(
                          mainAxisSize: MainAxisSize.min,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            if (widget.icon != null) ...[
                              AppIcon(
                                widget.icon!,
                                size: _iconSize,
                                color: isDisabled ? fg.withAlpha(150) : fg,
                              ),
                              const SizedBox(width: AppDimensions.xs),
                            ],
                            Text(
                              widget.text,
                              style: AppTypography.buttonStyle.copyWith(
                                fontSize: _fontSize,
                                color: isDisabled ? fg.withAlpha(150) : fg,
                              ),
                            ),
                          ],
                        ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
