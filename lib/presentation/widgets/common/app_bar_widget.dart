import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_icons.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';

/// 自定义 AppBar
///
/// 对齐 `docs/DESIGN.md` §7.10。
/// - 底 canvas、底部 1px hairline、elevation 0、高度 56。
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
        56 + (bottom?.preferredSize.height ?? 0),
      );

  @override
  Widget build(BuildContext context) {
    return AppBar(
      leading: showBack
          ? IconButton(
              icon: const AppIcon(AppIcons.back),
              onPressed: () => context.pop(),
              color: AppColors.inkMuted,
            )
          : null,
      title: Text(
        title,
        style: AppTypography.headlineStyle.copyWith(
          fontSize: AppTypography.cardTitle,
          fontWeight: AppTypography.semiBold,
        ),
      ),
      actions: actions,
      bottom: bottom,
      backgroundColor: AppColors.canvas,
      elevation: 0,
      scrolledUnderElevation: 0,
      toolbarHeight: 56,
      shape: const Border(
        bottom: BorderSide(color: AppColors.hairline, width: 1),
      ),
    );
  }
}
