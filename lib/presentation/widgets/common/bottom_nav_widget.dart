import 'package:flutter/material.dart';

import '../../../core/theme/app_icons.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';

/// 底部导航栏
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
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.bgBase,
        border: Border(
          top: BorderSide(color: AppColors.borderSubtle),
        ),
      ),
      child: SafeArea(
        child: SizedBox(
          height: 56,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _NavItem(
                icon: AppIcons.repository,
                activeIcon: AppIcons.repository,
                label: '仓库',
                isActive: currentIndex == 0,
                onTap: () => onTap(0),
              ),
              _NavItem(
                icon: AppIcons.heatmap,
                activeIcon: AppIcons.heatmap,
                label: '热力图',
                isActive: currentIndex == 1,
                onTap: () => onTap(1),
              ),
              _NavItem(
                icon: AppIcons.graph,
                activeIcon: AppIcons.graph,
                label: '图形',
                isActive: currentIndex == 2,
                onTap: () => onTap(2),
              ),
              _NavItem(
                icon: AppIcons.settings,
                activeIcon: AppIcons.settings,
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
    required this.activeIcon,
    required this.label,
    required this.isActive,
    required this.onTap,
  });

  final AppIconName icon;
  final AppIconName activeIcon;
  final String label;
  final bool isActive;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color =
        isActive ? AppColors.primary : AppColors.textTertiary;

    return Semantics(
      button: true,
      selected: isActive,
      label: label,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
        child: SizedBox(
          width: 64,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              AppIcon(
                isActive ? activeIcon : icon,
                size: 24,
                color: color,
              ),
              const SizedBox(height: AppDimensions.xxs),
              Text(
                label,
                style: TextStyle(
                  fontFamily: AppTypography.bodyFont,
                  fontSize: AppTypography.xs,
                  color: color,
                  fontWeight: isActive
                      ? AppTypography.medium
                      : AppTypography.regular,
                ),
              ),
              if (isActive)
                Container(
                  margin: const EdgeInsets.only(top: 2),
                  width: 16,
                  height: 2,
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(1),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
