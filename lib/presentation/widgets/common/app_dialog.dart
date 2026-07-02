import 'package:flutter/material.dart';

import '../../../core/theme/app_theme_colors.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';
import 'app_button.dart';

/// 通用弹窗
///
/// 对齐 `docs/DESIGN.md` §7.12。
/// - 底 surface1、`radiusXl`(16)、padding 24、1px hairlineStrong、遮罩 overlay@50%。
/// - 标题 headline；按钮组右对齐（secondary 左、primary 右）。
class AppDialog<T> extends StatelessWidget {
  const AppDialog({
    super.key,
    required this.title,
    this.content,
    this.actions,
    this.maxWidth = 420,
  });

  final String title;
  final Widget? content;
  final List<DialogAction<T>>? actions;
  final double maxWidth;

  /// 显示弹窗的静态方法
  static Future<T?> show<T>(
    BuildContext context, {
    required String title,
    Widget? content,
    List<DialogAction<T>>? actions,
  }) {
    return showDialog<T>(
      context: context,
      barrierColor: AppColors.overlay,
      builder: (context) => AppDialog<T>(
        title: title,
        content: content,
        actions: actions,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppThemeColors.of(context);
    return Dialog(
      backgroundColor: colors.surface1,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppDimensions.radiusXl),
        side: BorderSide(color: colors.hairlineStrong),
      ),
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxWidth),
        child: Padding(
          padding: const EdgeInsets.all(AppDimensions.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: AppTypography.headlineStyle),
              if (content != null) ...[
                const SizedBox(height: AppDimensions.md),
                DefaultTextStyle(
                  style: AppTypography.bodyStyle.copyWith(
                    color: colors.inkMuted,
                  ),
                  child: content!,
                ),
              ],
              if (actions != null && actions!.isNotEmpty) ...[
                const SizedBox(height: AppDimensions.lg),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    for (var i = 0; i < actions!.length; i++) ...[
                      if (i > 0) const SizedBox(width: AppDimensions.xs),
                      AppButton(
                        text: actions![i].text,
                        onPressed: () {
                          Navigator.of(context).pop(actions![i].value);
                          actions![i].onPressed?.call();
                        },
                        variant: actions![i].variant,
                        size: ButtonSize.sm,
                      ),
                    ],
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// 弹窗按钮配置
class DialogAction<T> {
  const DialogAction({
    required this.text,
    this.value,
    this.variant = ButtonVariant.primary,
    this.onPressed,
  });

  final String text;
  final T? value;
  final ButtonVariant variant;
  final VoidCallback? onPressed;
}
