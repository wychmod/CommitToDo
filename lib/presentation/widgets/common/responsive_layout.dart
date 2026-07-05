import 'package:flutter/material.dart';

import '../../../core/theme/dimensions.dart';

/// 响应式断点工具
///
/// 对齐 `docs/DESIGN.md` §9.1。
class ResponsiveLayout {
  ResponsiveLayout._();

  static Size _size(BuildContext context) => MediaQuery.sizeOf(context);

  /// < 768
  static bool isMobile(BuildContext context) =>
      _size(context).width < AppDimensions.mobileBreakpoint;

  /// 768 ~ 1023
  static bool isMobileLg(BuildContext context) =>
      _size(context).width >= AppDimensions.mobileBreakpoint &&
      _size(context).width < AppDimensions.tabletBreakpoint;

  /// 1024 ~ 1279
  static bool isTablet(BuildContext context) =>
      _size(context).width >= AppDimensions.tabletBreakpoint &&
      _size(context).width < AppDimensions.desktopBreakpoint;

  /// 1280 ~ 1439
  static bool isDesktop(BuildContext context) =>
      _size(context).width >= AppDimensions.desktopBreakpoint &&
      _size(context).width < AppDimensions.desktopXlBreakpoint;

  /// ≥ 1440
  static bool isDesktopXl(BuildContext context) =>
      _size(context).width >= AppDimensions.desktopXlBreakpoint;

  /// ≥ 1024（桌面/平板大屏）
  static bool isWide(BuildContext context) =>
      _size(context).width >= AppDimensions.tabletBreakpoint;
}

/// 按断点构建不同子树的便捷组件。
class ResponsiveBuilder extends StatelessWidget {
  const ResponsiveBuilder({
    super.key,
    required this.mobile,
    this.tablet,
    required this.desktop,
  });

  final Widget mobile;
  final Widget? tablet;
  final Widget desktop;

  @override
  Widget build(BuildContext context) {
    if (ResponsiveLayout.isMobile(context) ||
        ResponsiveLayout.isMobileLg(context)) {
      return mobile;
    }
    if (ResponsiveLayout.isTablet(context)) {
      return tablet ?? desktop;
    }
    return desktop;
  }
}
