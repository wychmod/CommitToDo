import 'package:flutter/material.dart';

import 'colors.dart';
import 'dimensions.dart';
import 'typography.dart';

/// 应用主题配置
ThemeData buildLightTheme() {
  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    colorScheme: const ColorScheme.light(
      primary: AppColors.primary,
      onPrimary: Colors.white,
      secondary: AppColors.primaryDark,
      surface: Color(0xFFFFFFFF),
      onSurface: Color(0xFF0F172A),
      error: AppColors.error,
      onError: Colors.white,
    ),
    scaffoldBackgroundColor: const Color(0xFFF8FAFC),
    textTheme: const TextTheme(
      displayLarge: TextStyle(
        fontFamily: AppTypography.headingFont,
        fontSize: AppTypography.xxxl,
        fontWeight: AppTypography.bold,
        color: Color(0xFF0F172A),
      ),
      headlineMedium: TextStyle(
        fontFamily: AppTypography.headingFont,
        fontSize: AppTypography.xxl,
        fontWeight: AppTypography.semiBold,
        color: Color(0xFF0F172A),
      ),
      titleLarge: TextStyle(
        fontFamily: AppTypography.bodyFont,
        fontSize: AppTypography.lg,
        fontWeight: AppTypography.medium,
        color: Color(0xFF0F172A),
      ),
      bodyLarge: TextStyle(
        fontFamily: AppTypography.bodyFont,
        fontSize: AppTypography.base,
        fontWeight: AppTypography.regular,
        color: Color(0xFF0F172A),
      ),
      bodyMedium: TextStyle(
        fontFamily: AppTypography.bodyFont,
        fontSize: AppTypography.sm,
        fontWeight: AppTypography.regular,
        color: Color(0xFF475569),
      ),
      labelSmall: TextStyle(
        fontFamily: AppTypography.monoFont,
        fontSize: AppTypography.xs,
        fontWeight: AppTypography.medium,
        color: Color(0xFF64748B),
      ),
    ),
    cardTheme: CardTheme(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
        borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
        borderSide: const BorderSide(
          color: AppColors.primary,
          width: 2,
        ),
      ),
      contentPadding: const EdgeInsets.symmetric(
        horizontal: AppDimensions.base,
        vertical: AppDimensions.md,
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(
          horizontal: AppDimensions.base,
          vertical: AppDimensions.md,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
        ),
      ),
    ),
    iconTheme: const IconThemeData(
      size: 20,
      color: Color(0xFF475569),
    ),
    dividerTheme: const DividerThemeData(
      color: Color(0xFFE2E8F0),
      thickness: 1,
      space: 1,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Color(0xFFF8FAFC),
      foregroundColor: Color(0xFF0F172A),
      elevation: 0,
      centerTitle: false,
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: Color(0xFFF8FAFC),
      selectedItemColor: AppColors.primary,
      unselectedItemColor: Color(0xFF64748B),
      type: BottomNavigationBarType.fixed,
      elevation: 0,
    ),
  );
}

ThemeData buildDarkTheme() {
  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,

    // 色彩方案
    colorScheme: ColorScheme.dark(
      primary: AppColors.primary,
      onPrimary: Colors.white,
      secondary: AppColors.primaryLight,
      surface: AppColors.bgElevated,
      onSurface: AppColors.textPrimary,
      error: AppColors.error,
      onError: Colors.white,
    ),

    // 背景色
    scaffoldBackgroundColor: AppColors.bgBase,

    // 文字主题
    textTheme: const TextTheme(
      displayLarge: TextStyle(
        fontFamily: AppTypography.headingFont,
        fontSize: AppTypography.xxxl,
        fontWeight: AppTypography.bold,
        color: AppColors.textPrimary,
      ),
      headlineMedium: TextStyle(
        fontFamily: AppTypography.headingFont,
        fontSize: AppTypography.xxl,
        fontWeight: AppTypography.semiBold,
        color: AppColors.textPrimary,
      ),
      titleLarge: TextStyle(
        fontFamily: AppTypography.bodyFont,
        fontSize: AppTypography.lg,
        fontWeight: AppTypography.medium,
        color: AppColors.textPrimary,
      ),
      bodyLarge: TextStyle(
        fontFamily: AppTypography.bodyFont,
        fontSize: AppTypography.base,
        fontWeight: AppTypography.regular,
        color: AppColors.textPrimary,
      ),
      bodyMedium: TextStyle(
        fontFamily: AppTypography.bodyFont,
        fontSize: AppTypography.sm,
        fontWeight: AppTypography.regular,
        color: AppColors.textSecondary,
      ),
      labelSmall: TextStyle(
        fontFamily: AppTypography.monoFont,
        fontSize: AppTypography.xs,
        fontWeight: AppTypography.medium,
        color: AppColors.textTertiary,
      ),
    ),

    // 卡片主题
    cardTheme: CardTheme(
      color: AppColors.bgElevated,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
        side: const BorderSide(color: AppColors.borderSubtle),
      ),
    ),

    // 输入框主题
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.bgSurface,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
        borderSide: const BorderSide(color: AppColors.borderDefault),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
        borderSide: const BorderSide(
          color: AppColors.primary,
          width: 2,
        ),
      ),
      contentPadding: const EdgeInsets.symmetric(
        horizontal: AppDimensions.base,
        vertical: AppDimensions.md,
      ),
    ),

    // 按钮主题
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(
          horizontal: AppDimensions.base,
          vertical: AppDimensions.md,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
        ),
      ),
    ),

    // 图标主题
    iconTheme: const IconThemeData(
      size: 20,
      color: AppColors.textSecondary,
    ),

    // 分隔线
    dividerTheme: const DividerThemeData(
      color: AppColors.borderSubtle,
      thickness: 1,
      space: 1,
    ),

    // AppBar 主题
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.bgBase,
      foregroundColor: AppColors.textPrimary,
      elevation: 0,
      centerTitle: false,
    ),

    // 底部导航栏主题
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: AppColors.bgBase,
      selectedItemColor: AppColors.primary,
      unselectedItemColor: AppColors.textTertiary,
      type: BottomNavigationBarType.fixed,
      elevation: 0,
    ),
  );
}
