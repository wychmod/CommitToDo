import 'package:flutter/material.dart';

import 'colors.dart';

/// Commit 语义色 token 在 [ThemeData] 中的扩展。
///
/// DESIGN.md §2 的完整 surface ladder / hairline / ink 在浅/深模式下取值不同。
/// 组件层应通过 `AppThemeColors.of(context)` 取色，而不是直接引用
/// `AppColors.surface1` 等深色常量——否则浅色模式下组件背景不会跟随主题。
///
/// 在 `app_theme.dart` 的 light/dark 主题里分别注入对应实例。
@immutable
class AppThemeColors extends ThemeExtension<AppThemeColors> {
  const AppThemeColors({
    required this.canvas,
    required this.surface1,
    required this.surface2,
    required this.surface3,
    required this.surface4,
    required this.hairline,
    required this.hairlineStrong,
    required this.hairlineTertiary,
    required this.ink,
    required this.inkMuted,
    required this.inkSubtle,
    required this.inkTertiary,
    required this.edgeHighlight,
  });

  /// 深色模式实例（DESIGN.md §2 深色色板）。
  static const AppThemeColors dark = AppThemeColors(
    canvas: AppColors.canvas,
    surface1: AppColors.surface1,
    surface2: AppColors.surface2,
    surface3: AppColors.surface3,
    surface4: AppColors.surface4,
    hairline: AppColors.hairline,
    hairlineStrong: AppColors.hairlineStrong,
    hairlineTertiary: AppColors.hairlineTertiary,
    ink: AppColors.ink,
    inkMuted: AppColors.inkMuted,
    inkSubtle: AppColors.inkSubtle,
    inkTertiary: AppColors.inkTertiary,
    edgeHighlight: AppColors.edgeHighlight,
  );

  /// 浅色模式实例（DESIGN.md §9.4 浅色映射）。
  static const AppThemeColors light = AppThemeColors(
    canvas: AppColors.lightCanvas,
    surface1: AppColors.lightSurface1,
    surface2: AppColors.lightSurface2,
    surface3: AppColors.lightSurface3,
    surface4: AppColors.lightSurface4,
    hairline: AppColors.lightHairline,
    hairlineStrong: AppColors.lightHairlineStrong,
    hairlineTertiary: AppColors.lightHairlineTertiary,
    ink: AppColors.lightInk,
    inkMuted: AppColors.lightInkMuted,
    inkSubtle: AppColors.lightInkSubtle,
    inkTertiary: AppColors.lightInkTertiary,
    edgeHighlight: Color(0x0F000000),
  );

  /// 从 context 取当前主题的 [AppThemeColors]，缺失时回退深色。
  static AppThemeColors of(BuildContext context) {
    return Theme.of(context).extension<AppThemeColors>() ?? dark;
  }

  final Color canvas;
  final Color surface1;
  final Color surface2;
  final Color surface3;
  final Color surface4;
  final Color hairline;
  final Color hairlineStrong;
  final Color hairlineTertiary;
  final Color ink;
  final Color inkMuted;
  final Color inkSubtle;
  final Color inkTertiary;
  final Color edgeHighlight;

  @override
  AppThemeColors copyWith({
    Color? canvas,
    Color? surface1,
    Color? surface2,
    Color? surface3,
    Color? surface4,
    Color? hairline,
    Color? hairlineStrong,
    Color? hairlineTertiary,
    Color? ink,
    Color? inkMuted,
    Color? inkSubtle,
    Color? inkTertiary,
    Color? edgeHighlight,
  }) {
    return AppThemeColors(
      canvas: canvas ?? this.canvas,
      surface1: surface1 ?? this.surface1,
      surface2: surface2 ?? this.surface2,
      surface3: surface3 ?? this.surface3,
      surface4: surface4 ?? this.surface4,
      hairline: hairline ?? this.hairline,
      hairlineStrong: hairlineStrong ?? this.hairlineStrong,
      hairlineTertiary: hairlineTertiary ?? this.hairlineTertiary,
      ink: ink ?? this.ink,
      inkMuted: inkMuted ?? this.inkMuted,
      inkSubtle: inkSubtle ?? this.inkSubtle,
      inkTertiary: inkTertiary ?? this.inkTertiary,
      edgeHighlight: edgeHighlight ?? this.edgeHighlight,
    );
  }

  @override
  AppThemeColors lerp(ThemeExtension<AppThemeColors>? other, double t) {
    if (other is! AppThemeColors) return this;
    return AppThemeColors(
      canvas: Color.lerp(canvas, other.canvas, t)!,
      surface1: Color.lerp(surface1, other.surface1, t)!,
      surface2: Color.lerp(surface2, other.surface2, t)!,
      surface3: Color.lerp(surface3, other.surface3, t)!,
      surface4: Color.lerp(surface4, other.surface4, t)!,
      hairline: Color.lerp(hairline, other.hairline, t)!,
      hairlineStrong: Color.lerp(hairlineStrong, other.hairlineStrong, t)!,
      hairlineTertiary: Color.lerp(hairlineTertiary, other.hairlineTertiary, t)!,
      ink: Color.lerp(ink, other.ink, t)!,
      inkMuted: Color.lerp(inkMuted, other.inkMuted, t)!,
      inkSubtle: Color.lerp(inkSubtle, other.inkSubtle, t)!,
      inkTertiary: Color.lerp(inkTertiary, other.inkTertiary, t)!,
      edgeHighlight: Color.lerp(edgeHighlight, other.edgeHighlight, t)!,
    );
  }
}
