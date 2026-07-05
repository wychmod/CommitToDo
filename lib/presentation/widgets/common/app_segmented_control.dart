import 'package:flutter/material.dart';

import '../../../core/theme/app_theme_colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';

/// Segmented Control 选项数据。
@immutable
class AppSegmentedOption<T> {
  const AppSegmentedOption({
    required this.value,
    required this.label,
    this.leading,
  });

  final T value;
  final String label;
  final Widget? leading;
}

/// 分段选择器
///
/// 对齐 `docs/DESIGN.md` §7.2。
/// - 容器：canvas 底、radiusPill、1px hairline。
/// - 选中：surface2 底 + ink 字；未选中：canvas 底 + inkSubtle 字。
/// - 每个选项独立 `Semantics` + `InkWell`。
class AppSegmentedControl<T extends Object> extends StatelessWidget {
  const AppSegmentedControl({
    super.key,
    required this.options,
    required this.selected,
    required this.onSelected,
  });

  final List<AppSegmentedOption<T>> options;
  final T selected;
  final ValueChanged<T> onSelected;

  @override
  Widget build(BuildContext context) {
    final colors = AppThemeColors.of(context);
    return Container(
      padding: const EdgeInsets.all(AppDimensions.micro),
      decoration: BoxDecoration(
        color: colors.canvas,
        borderRadius: BorderRadius.circular(AppDimensions.radiusPill),
        border: Border.all(color: colors.hairline),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var i = 0; i < options.length; i++) ...[
            if (i > 0) const SizedBox(width: AppDimensions.micro),
            _Segment<T>(
              option: options[i],
              isSelected: options[i].value == selected,
              onTap: () => onSelected(options[i].value),
            ),
          ],
        ],
      ),
    );
  }
}

class _Segment<T> extends StatelessWidget {
  const _Segment({
    required this.option,
    required this.isSelected,
    required this.onTap,
  });

  final AppSegmentedOption<T> option;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = AppThemeColors.of(context);
    return Semantics(
      button: true,
      selected: isSelected,
      label: option.label,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppDimensions.radiusPill),
        child: AnimatedContainer(
          duration: AppDimensions.animFast,
          curve: AppDimensions.easeOutQuart,
          constraints: const BoxConstraints(
            minHeight: AppDimensions.tapTargetMin,
          ),
          padding: const EdgeInsets.symmetric(
            horizontal: AppDimensions.sm + 2,
            vertical: AppDimensions.xs - AppDimensions.micro,
          ),
          decoration: BoxDecoration(
            color: isSelected ? colors.surface2 : colors.canvas,
            borderRadius: BorderRadius.circular(AppDimensions.radiusPill),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (option.leading != null) ...[
                option.leading!,
                const SizedBox(width: AppDimensions.xxs),
              ],
              Text(
                option.label,
                style: AppTypography.monoSmStyle.copyWith(
                  color: isSelected ? colors.ink : colors.inkSubtle,
                  fontWeight:
                      isSelected ? AppTypography.medium : null,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
