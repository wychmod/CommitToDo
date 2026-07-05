import 'package:flutter/material.dart';

import '../../../core/theme/app_theme_colors.dart';
import '../../../core/theme/dimensions.dart';

/// Master-Detail 分栏布局
///
/// 对齐 `docs/DESIGN.md` §13.5。
/// - 桌面端（≥1024）：左侧 master，右侧 detail，中间 hairline 分隔。
/// - 移动端（<1024）：只显示 master；detail 由调用方通过导航单独展示。
class SplitView extends StatelessWidget {
  const SplitView({
    super.key,
    required this.master,
    required this.detail,
    this.detailVisible = true,
    this.masterFlex = 2,
    this.detailFlex = 3,
    this.emptyDetail,
  });

  final Widget master;
  final Widget detail;

  /// 桌面端是否显示右侧面板。
  final bool detailVisible;

  /// 左侧面板占比。
  final int masterFlex;

  /// 右侧面板占比。
  final int detailFlex;

  /// 桌面端 detailVisible=false 时右侧面板占位。
  final Widget? emptyDetail;

  @override
  Widget build(BuildContext context) {
    final colors = AppThemeColors.of(context);
    final isWide = MediaQuery.sizeOf(context).width >=
        AppDimensions.tabletBreakpoint;

    if (!isWide) return master;

    return Row(
      children: [
        Expanded(
          flex: masterFlex,
          child: master,
        ),
        VerticalDivider(
          width: 1,
          thickness: 1,
          color: colors.hairline,
        ),
        Expanded(
          flex: detailFlex,
          child: detailVisible
              ? detail
              : (emptyDetail ?? const SizedBox.expand()),
        ),
      ],
    );
  }
}
