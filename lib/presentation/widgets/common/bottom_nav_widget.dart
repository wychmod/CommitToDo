import 'package:flutter/material.dart';

import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme_colors.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';

/// 底部导航栏
///
/// 对齐 `docs/DESIGN.md` §7.10。
/// - 底 canvas、顶部 1px hairline、选中 primary、未选中 inkSubtle、label monoSm、项高 48。
class BottomNavWidget extends StatelessWidget {
  const BottomNavWidget({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  final int currentIndex;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    final colors = AppThemeColors.of(context);
    return Container(
      decoration: BoxDecoration(
        color: colors.canvas,
        border: Border(
          top: BorderSide(color: colors.hairline, width: 1),
        ),
      ),
      child: SafeArea(
        child: SizedBox(
          height: AppDimensions.navItemHeight,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _NavItem(
                icon: AppIcons.repository,
                label: '仓库',
                isActive: currentIndex == 0,
                onTap: () => onTap(0),
              ),
              _NavItem(
                icon: AppIcons.heatmap,
                label: '热力图',
                isActive: currentIndex == 1,
                onTap: () => onTap(1),
              ),
              _NavItem(
                icon: AppIcons.graph,
                label: '图形',
                isActive: currentIndex == 2,
                onTap: () => onTap(2),
              ),
              _NavItem(
                icon: AppIcons.settings,
                label: '设置',
                isActive: currentIndex == 3,
                onTap: () => onTap(3),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.label,
    required this.isActive,
    required this.onTap,
  });

  final AppIconName icon;
  final String label;
  final bool isActive;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = AppThemeColors.of(context);
    final color = isActive ? AppColors.primary : colors.inkSubtle;

    return Semantics(
      button: true,
      selected: isActive,
      label: label,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
        child: SizedBox(
          width: AppDimensions.navItemHeight + AppDimensions.md,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              AppIcon(icon, size: AppDimensions.iconNav, color: color),
              const SizedBox(height: AppDimensions.micro),
              Text(
                label,
                style: AppTypography.monoSmStyle.copyWith(
                  color: color,
                  fontWeight:
                      isActive ? AppTypography.medium : AppTypography.regular,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
