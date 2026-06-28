import 'package:flutter/material.dart';

import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';
import 'app_button.dart';

/// 通用弹窗
class AppDialog extends StatelessWidget {
  const AppDialog({
    super.key,
    required this.title,
    this.content,
    this.actions,
    this.maxWidth = 400,
  });

  final String title;
  final Widget? content;
  final List<DialogAction>? actions;
  final double maxWidth;

  /// 显示弹窗的静态方法
  static Future<T?> show<T>(
    BuildContext context, {
    required String title,
    Widget? content,
    List<DialogAction>? actions,
  }) {
    return showDialog<T>(
      context: context,
      builder: (context) => AppDialog(
        title: title,
        content: content,
        actions: actions,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: AppColors.bgElevated,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(
          AppDimensions.radiusXl,
        ),
      ),
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxWidth),
        child: Padding(
          padding: const EdgeInsets.all(AppDimensions.xl),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 标题
              Text(
                title,
                style: const TextStyle(
                  fontFamily: AppTypography.headingFont,
                  fontSize: AppTypography.xl,
                  fontWeight: AppTypography.semiBold,
                  color: AppColors.textPrimary,
                ),
              ),
              if (content != null) ...[
                const SizedBox(height: AppDimensions.base),
                DefaultTextStyle(
                  style: const TextStyle(
                    fontSize: AppTypography.base,
                    color: AppColors.textSecondary,
                  ),
                  child: content!,
                ),
              ],
              if (actions != null && actions!.isNotEmpty) ...[
                const SizedBox(height: AppDimensions.xl),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    for (var i = 0; i < actions!.length; i++) ...[
                      if (i > 0)
                        const SizedBox(
                          width: AppDimensions.md,
                        ),
                      AppButton(
                        text: actions![i].text,
                        onPressed: () {
                          Navigator.of(context).pop(
                            actions![i].value,
                          );
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
