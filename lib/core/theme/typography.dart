import 'package:flutter/widgets.dart';

/// 字体系统常量
class AppTypography {
  AppTypography._();

  // ─── 字体族 ───
  static const String headingFont = 'JetBrains Mono';
  static const String bodyFont = 'IBM Plex Sans';
  static const String monoFont = 'JetBrains Mono';

  // ─── 字体大小 ───
  static const double xs = 11.0;
  static const double sm = 13.0;
  static const double base = 15.0;
  static const double lg = 17.0;
  static const double xl = 20.0;
  static const double xxl = 24.0;
  static const double xxxl = 32.0;

  // ─── 行高 ───
  static const double lineHeightTight = 1.2;
  static const double lineHeightNormal = 1.5;
  static const double lineHeightRelaxed = 1.75;

  // ─── 字重 ───
  static const FontWeight light = FontWeight.w300;
  static const FontWeight regular = FontWeight.w400;
  static const FontWeight medium = FontWeight.w500;
  static const FontWeight semiBold = FontWeight.w600;
  static const FontWeight bold = FontWeight.w700;

  // ─── 预设样式 ───
  static const TextStyle pageTitle = TextStyle(
    fontFamily: headingFont,
    fontSize: xxxl,
    fontWeight: bold,
    height: lineHeightTight,
  );

  static const TextStyle sectionTitle = TextStyle(
    fontFamily: headingFont,
    fontSize: xxl,
    fontWeight: semiBold,
    height: lineHeightTight,
  );

  static const TextStyle cardTitle = TextStyle(
    fontFamily: bodyFont,
    fontSize: lg,
    fontWeight: medium,
    height: lineHeightNormal,
  );

  static const TextStyle body = TextStyle(
    fontFamily: bodyFont,
    fontSize: base,
    fontWeight: regular,
    height: lineHeightNormal,
  );

  static const TextStyle bodySmall = TextStyle(
    fontFamily: bodyFont,
    fontSize: sm,
    fontWeight: regular,
    height: lineHeightNormal,
  );

  static const TextStyle label = TextStyle(
    fontFamily: monoFont,
    fontSize: xs,
    fontWeight: medium,
    height: lineHeightTight,
  );

  static const TextStyle branchName = TextStyle(
    fontFamily: monoFont,
    fontSize: sm,
    fontWeight: medium,
    height: lineHeightTight,
  );

  static const TextStyle code = TextStyle(
    fontFamily: monoFont,
    fontSize: sm,
    fontWeight: regular,
    height: lineHeightNormal,
  );
}
