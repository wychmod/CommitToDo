import 'package:flutter/material.dart';

import 'colors.dart';
import 'dimensions.dart';
import 'typography.dart';

/// 应用主题配置
///
/// 对齐 `docs/DESIGN.md`。深色模式为系统主模式（§1-§8），
/// 浅色模式为可选跟随（§9.4）。
///
/// 设计要点：
/// - 深色面靠 surface ladder + hairline 承层级，elevation 全部为 0。
/// - 卡片 `radiusLg`(12) + 1px hairline。
/// - CTA `radiusMd`(8)，绝不 pill。
/// - textTheme 全部走 AppTypography 预设（含 letterSpacing）。

// ─── 深色模式 surface/ink token（DESIGN.md §2.2-2.4）───
const _darkCanvas = AppColors.canvas;
const _darkSurface1 = AppColors.surface1;
const _darkHairline = AppColors.hairline;
const _darkHairlineStrong = AppColors.hairlineStrong;
const _darkInk = AppColors.ink;
const _darkInkMuted = AppColors.inkMuted;
const _darkInkSubtle = AppColors.inkSubtle;

// ─── 浅色模式 surface/ink token（DESIGN.md §9.4）───
const _lightCanvas = AppColors.lightCanvas;
const _lightSurface1 = AppColors.lightSurface1;
const _lightHairline = AppColors.lightHairline;
const _lightHairlineStrong = AppColors.lightHairlineStrong;
const _lightInk = AppColors.lightInk;
const _lightInkMuted = AppColors.lightInkMuted;
const _lightInkSubtle = AppColors.lightInkSubtle;

/// focus ring 颜色：2px primaryFocus @ 50% opacity。
Color get _focusRingColor => AppColors.primaryFocus.withAlpha(128);

ThemeData buildLightTheme() {
  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    colorScheme: ColorScheme.light(
      primary: AppColors.primary,
      onPrimary: AppColors.onPrimary,
      secondary: AppColors.primaryDark,
      surface: _lightSurface1,
      onSurface: _lightInk,
      error: AppColors.error,
      onError: AppColors.onPrimary,
      outline: _lightHairlineStrong,
    ),
    scaffoldBackgroundColor: _lightCanvas,
    textTheme: _buildTextTheme(_lightInk, _lightInkMuted, _lightInkSubtle),
    cardTheme: CardThemeData(
      color: _lightSurface1,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppDimensions.radiusLg),
        side: const BorderSide(color: _lightHairline),
      ),
    ),
    inputDecorationTheme: _buildInputTheme(
      surface: _lightSurface1,
      hairline: _lightHairlineStrong,
      ink: _lightInk,
      hint: _lightInkSubtle,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: _buildButtonStyle(
        background: AppColors.primary,
        foreground: AppColors.onPrimary,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: _buildOutlinedButtonStyle(
        surface: _lightSurface1,
        ink: _lightInk,
        hairline: _lightHairline,
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: _buildTextButtonStyle(ink: _lightInk),
    ),
    iconTheme: const IconThemeData(
      size: AppDimensions.iconMd,
      color: _lightInkMuted,
    ),
    dividerTheme: const DividerThemeData(
      color: _lightHairline,
      thickness: 1,
      space: 1,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: _lightCanvas,
      foregroundColor: _lightInk,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      toolbarHeight: 56,
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: _lightCanvas,
      selectedItemColor: AppColors.primary,
      unselectedItemColor: _lightInkSubtle,
      type: BottomNavigationBarType.fixed,
      elevation: 0,
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: _lightSurface1,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppDimensions.radiusXl),
        side: const BorderSide(color: _lightHairlineStrong),
      ),
    ),
    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: AppColors.primary,
    ),
  );
}

ThemeData buildDarkTheme() {
  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: ColorScheme.dark(
      primary: AppColors.primary,
      onPrimary: AppColors.onPrimary,
      secondary: AppColors.primaryLight,
      surface: _darkSurface1,
      onSurface: _darkInk,
      error: AppColors.error,
      onError: AppColors.onPrimary,
      outline: _darkHairlineStrong,
    ),
    scaffoldBackgroundColor: _darkCanvas,
    textTheme: _buildTextTheme(_darkInk, _darkInkMuted, _darkInkSubtle),
    cardTheme: CardThemeData(
      color: _darkSurface1,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppDimensions.radiusLg),
        side: const BorderSide(color: _darkHairline),
      ),
    ),
    inputDecorationTheme: _buildInputTheme(
      surface: _darkSurface1,
      hairline: _darkHairlineStrong,
      ink: _darkInk,
      hint: _darkInkSubtle,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: _buildButtonStyle(
        background: AppColors.primary,
        foreground: AppColors.onPrimary,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: _buildOutlinedButtonStyle(
        surface: _darkSurface1,
        ink: _darkInk,
        hairline: _darkHairline,
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: _buildTextButtonStyle(ink: _darkInk),
    ),
    iconTheme: const IconThemeData(
      size: AppDimensions.iconMd,
      color: _darkInkMuted,
    ),
    dividerTheme: const DividerThemeData(
      color: _darkHairline,
      thickness: 1,
      space: 1,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: _darkCanvas,
      foregroundColor: _darkInk,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      toolbarHeight: 56,
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: _darkCanvas,
      selectedItemColor: AppColors.primary,
      unselectedItemColor: _darkInkSubtle,
      type: BottomNavigationBarType.fixed,
      elevation: 0,
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: _darkSurface1,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppDimensions.radiusXl),
        side: const BorderSide(color: _darkHairlineStrong),
      ),
    ),
    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: AppColors.primary,
    ),
  );
}

// ─── 主题构建辅助 ───

TextTheme _buildTextTheme(Color ink, Color inkMuted, Color inkSubtle) {
  return TextTheme(
    displayLarge: AppTypography.displayXlStyle.copyWith(color: ink),
    displayMedium: AppTypography.displayLgStyle.copyWith(color: ink),
    displaySmall: AppTypography.displayMdStyle.copyWith(color: ink),
    headlineMedium: AppTypography.headlineStyle.copyWith(color: ink),
    titleLarge: AppTypography.cardTitleStyle.copyWith(color: ink),
    bodyLarge: AppTypography.bodyLgStyle.copyWith(color: ink),
    bodyMedium: AppTypography.bodyStyle.copyWith(color: ink),
    bodySmall: AppTypography.bodySmStyle.copyWith(color: inkMuted),
    labelLarge: AppTypography.buttonStyle.copyWith(color: ink),
    labelSmall: AppTypography.monoSmStyle.copyWith(color: inkSubtle),
  );
}

InputDecorationTheme _buildInputTheme({
  required Color surface,
  required Color hairline,
  required Color ink,
  required Color hint,
}) {
  final radius = BorderRadius.circular(AppDimensions.radiusMd);
  return InputDecorationTheme(
    filled: true,
    fillColor: surface,
    border: OutlineInputBorder(
      borderRadius: radius,
      borderSide: BorderSide(color: hairline),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: radius,
      borderSide: BorderSide(color: hairline),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: radius,
      borderSide: BorderSide(color: _focusRingColor, width: 2),
    ),
    errorBorder: OutlineInputBorder(
      borderRadius: radius,
      borderSide: const BorderSide(color: AppColors.error),
    ),
    focusedErrorBorder: OutlineInputBorder(
      borderRadius: radius,
      borderSide: const BorderSide(color: AppColors.error, width: 2),
    ),
    contentPadding: const EdgeInsets.symmetric(
      horizontal: AppDimensions.sm,
      vertical: AppDimensions.sm + 2,
    ),
    hintStyle: TextStyle(color: hint),
    labelStyle: AppTypography.eyebrowStyle.copyWith(color: ink),
  );
}

ButtonStyle _buildButtonStyle({
  required Color background,
  required Color foreground,
}) {
  return ElevatedButton.styleFrom(
    backgroundColor: background,
    foregroundColor: foreground,
    elevation: 0,
    padding: const EdgeInsets.symmetric(
      horizontal: AppDimensions.ctaPaddingHorizontal,
      vertical: AppDimensions.xs,
    ),
    minimumSize: const Size(0, AppDimensions.ctaHeight),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
    ),
    textStyle: AppTypography.buttonStyle,
  );
}

ButtonStyle _buildOutlinedButtonStyle({
  required Color surface,
  required Color ink,
  required Color hairline,
}) {
  return OutlinedButton.styleFrom(
    foregroundColor: ink,
    backgroundColor: surface,
    elevation: 0,
    padding: const EdgeInsets.symmetric(
      horizontal: AppDimensions.ctaPaddingHorizontal,
      vertical: AppDimensions.xs,
    ),
    minimumSize: const Size(0, AppDimensions.ctaHeight),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
    ),
    side: BorderSide(color: hairline),
    textStyle: AppTypography.buttonStyle,
  );
}

ButtonStyle _buildTextButtonStyle({required Color ink}) {
  return TextButton.styleFrom(
    foregroundColor: ink,
    elevation: 0,
    padding: const EdgeInsets.symmetric(
      horizontal: AppDimensions.ctaPaddingHorizontal,
      vertical: AppDimensions.xs,
    ),
    minimumSize: const Size(0, AppDimensions.ctaHeight),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
    ),
    textStyle: AppTypography.buttonStyle,
  );
}
