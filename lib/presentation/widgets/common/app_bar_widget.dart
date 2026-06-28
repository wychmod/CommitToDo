import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_icons.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';

/// 自定义 AppBar
class AppBarWidget extends StatelessWidget
    implements PreferredSizeWidget {
  const AppBarWidget({
    super.key,
    required this.title,
    this.showBack = false,
    this.actions,
    this.bottom,
  });

  final String title;
  final bool showBack;
  final List<Widget>? actions;
  final PreferredSizeWidget? bottom;

  @override
  Size get preferredSize => Size.fromHeight(
        kToolbarHeight + (bottom?.preferredSize.height ?? 0),
      );

  @override
  Widget build(BuildContext context) {
    return AppBar(
      leading: showBack
          ? IconButton(
              icon: const AppIcon(AppIcons.back),
              onPressed: () => context.pop(),
              color: AppColors.textSecondary,
            )
          : null,
      title: Text(
        title,
        style: const TextStyle(
          fontFamily: AppTypography.headingFont,
          fontSize: AppTypography.xl,
          fontWeight: AppTypography.semiBold,
          color: AppColors.textPrimary,
        ),
      ),
      actions: actions,
      bottom: bottom,
      backgroundColor: AppColors.bgBase,
      elevation: 0,
      scrolledUnderElevation: 0,
    );
  }
}
