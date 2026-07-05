import 'package:flutter/material.dart';

import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme_colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';
import 'app_icon.dart';

/// 日期选择触发器
///
/// 对齐 `docs/DESIGN.md` §7.4。
/// - 外观同 `text-input`：surface1 底、radiusMd(8)、1px hairlineStrong。
/// - 左侧 calendar 图标；有值时右侧显示 clear 按钮。
/// - 点击唤起 `showDatePicker`，并覆盖主题以匹配 Commit 深色/浅色模式。
class AppDatePickerField extends StatelessWidget {
  const AppDatePickerField({
    super.key,
    this.value,
    this.label,
    this.hint,
    this.onChanged,
    this.firstDate,
    this.lastDate,
  });

  final DateTime? value;
  final String? label;
  final String? hint;
  final ValueChanged<DateTime?>? onChanged;
  final DateTime? firstDate;
  final DateTime? lastDate;

  String get _displayValue =>
      value != null ? _formatDate(value!) : (hint ?? '选择日期');

  static String _formatDate(DateTime date) {
    return '${date.year}-${date.month.toString().padLeft(2, '0')}'
        '-${date.day.toString().padLeft(2, '0')}';
  }

  Future<void> _pickDate(BuildContext context) async {
    final colors = AppThemeColors.of(context);
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: value ?? now,
      firstDate: firstDate ?? now.subtract(const Duration(days: 365)),
      lastDate: lastDate ?? now.add(const Duration(days: 365 * 2)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: Theme.of(context).colorScheme.copyWith(
                  primary: colors.primary,
                  onPrimary: colors.onPrimary,
                  surface: colors.surface1,
                  onSurface: colors.ink,
                ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) onChanged?.call(picked);
  }

  void _clear() => onChanged?.call(null);

  @override
  Widget build(BuildContext context) {
    final colors = AppThemeColors.of(context);
    final hasValue = value != null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (label != null) ...[
          Text(
            label!,
            style: AppTypography.eyebrowStyle.copyWith(
              color: colors.inkMuted,
            ),
          ),
          const SizedBox(height: AppDimensions.xs),
        ],
        Semantics(
          button: true,
          label: hasValue ? '已选日期 $_displayValue' : label ?? hint,
          child: InkWell(
            onTap: () => _pickDate(context),
            borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppDimensions.sm,
                vertical: AppDimensions.sm - AppDimensions.micro,
              ),
              constraints: const BoxConstraints(
                minHeight: AppDimensions.tapTargetMin,
              ),
              decoration: BoxDecoration(
                color: colors.surface1,
                borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
                border: Border.all(color: colors.hairlineStrong),
              ),
              child: Row(
                children: [
                  AppIcon(
                    AppIcons.calendar,
                    size: AppDimensions.iconSm,
                    color: colors.inkSubtle,
                  ),
                  const SizedBox(width: AppDimensions.xs),
                  Expanded(
                    child: Text(
                      _displayValue,
                      style: AppTypography.bodyStyle.copyWith(
                        color: hasValue ? colors.ink : colors.inkSubtle,
                      ),
                    ),
                  ),
                  if (hasValue)
                    Semantics(
                      button: true,
                      label: '清除日期',
                      child: InkWell(
                        onTap: _clear,
                        borderRadius: BorderRadius.circular(
                          AppDimensions.radiusFull,
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(AppDimensions.xxs),
                          child: AppIcon(
                            AppIcons.close,
                            size: AppDimensions.iconSm,
                            color: colors.inkSubtle,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
