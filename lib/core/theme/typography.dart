import 'package:flutter/widgets.dart';

/// 字体系统常量
///
/// 对齐 `docs/DESIGN.md` §3。
/// - 标题 + 正文：IBM Plex Sans（单一连续声音）
/// - branch name / commit id / label / 等宽技术标签：JetBrains Mono
///
/// 字距（letterSpacing）是 Linear 高级感的核心来源：display 激进负字距，
/// eyebrow 正字距，body 持平。
class AppTypography {
  AppTypography._();

  // ─── 字体族 ───
  static const String bodyFont = 'IBM Plex Sans';
  static const String headingFont = bodyFont;
  static const String monoFont = 'JetBrains Mono';

  /// 正文字体 fallback（DESIGN.md §3.1）。
  static const List<String> bodyFontFallback = [
    '-apple-system',
    'system-ui',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'sans-serif',
  ];

  /// 等宽字体 fallback（DESIGN.md §3.1）。
  static const List<String> monoFontFallback = [
    'ui-monospace',
    'SF Mono',
    'Menlo',
    'Monaco',
    'Consolas',
    'Liberation Mono',
    'Courier New',
    'monospace',
  ];

  // ─── 字体大小（DESIGN.md §3.2，13 档）───
  static const double displayXl = 48.0;
  static const double displayLg = 40.0;
  static const double displayMd = 32.0;
  static const double headline = 24.0;
  static const double cardTitle = 17.0;
  static const double subhead = 20.0;
  static const double bodyLg = 17.0;
  static const double body = 15.0;
  static const double bodySm = 13.0;
  static const double caption = 11.0;
  static const double button = 14.0;
  static const double eyebrow = 12.0;
  static const double mono = 13.0;
  static const double monoSm = 11.0;

  // ─── 字距（DESIGN.md §3.3，关键）───
  static const double trackingDisplayXl = -2.0;
  static const double trackingDisplayLg = -1.5;
  static const double trackingDisplayMd = -1.0;
  static const double trackingHeadline = -0.6;
  static const double trackingCardTitle = -0.4;
  static const double trackingSubhead = -0.2;
  static const double trackingBodyLg = -0.1;
  static const double trackingBody = -0.05;
  static const double trackingEyebrow = 0.4;

  // ─── 行高 ───
  static const double lineHeightTight = 1.2;
  static const double lineHeightDisplay = 1.1;
  static const double lineHeightNormal = 1.5;
  static const double lineHeightRelaxed = 1.75;

  // ─── 字重 ───
  static const FontWeight light = FontWeight.w300;
  static const FontWeight regular = FontWeight.w400;
  static const FontWeight medium = FontWeight.w500;
  static const FontWeight semiBold = FontWeight.w600;
  static const FontWeight bold = FontWeight.w700;

  // ─── 预设样式（DESIGN.md §3.2，含字距）───

  /// 首页空状态大标题、Git Graph 主标题（移动端缩到 32px）。
  static const TextStyle displayXlStyle = TextStyle(
    fontFamily: bodyFont,
    fontFamilyFallback: bodyFontFallback,
    fontSize: displayXl,
    fontWeight: semiBold,
    height: 1.05,
    letterSpacing: trackingDisplayXl,
  );

  /// 页面主标题。
  static const TextStyle displayLgStyle = TextStyle(
    fontFamily: bodyFont,
    fontFamilyFallback: bodyFontFallback,
    fontSize: displayLg,
    fontWeight: semiBold,
    height: 1.10,
    letterSpacing: trackingDisplayLg,
  );

  /// 区块大标题。
  static const TextStyle displayMdStyle = TextStyle(
    fontFamily: bodyFont,
    fontFamilyFallback: bodyFontFallback,
    fontSize: displayMd,
    fontWeight: semiBold,
    height: 1.15,
    letterSpacing: trackingDisplayMd,
  );

  /// 页面标题、卡片组标题。
  static const TextStyle headlineStyle = TextStyle(
    fontFamily: bodyFont,
    fontFamilyFallback: bodyFontFallback,
    fontSize: headline,
    fontWeight: semiBold,
    height: 1.20,
    letterSpacing: trackingHeadline,
  );

  /// 任务卡标题、仓库卡标题。
  static const TextStyle cardTitleStyle = TextStyle(
    fontFamily: bodyFont,
    fontFamilyFallback: bodyFontFallback,
    fontSize: cardTitle,
    fontWeight: medium,
    height: 1.25,
    letterSpacing: trackingCardTitle,
  );

  /// 引导正文。
  static const TextStyle subheadStyle = TextStyle(
    fontFamily: bodyFont,
    fontFamilyFallback: bodyFontFallback,
    fontSize: subhead,
    fontWeight: regular,
    height: 1.40,
    letterSpacing: trackingSubhead,
  );

  /// 重要正文。
  static const TextStyle bodyLgStyle = TextStyle(
    fontFamily: bodyFont,
    fontFamilyFallback: bodyFontFallback,
    fontSize: bodyLg,
    fontWeight: regular,
    height: 1.50,
    letterSpacing: trackingBodyLg,
  );

  /// 默认正文。
  static const TextStyle bodyStyle = TextStyle(
    fontFamily: bodyFont,
    fontFamilyFallback: bodyFontFallback,
    fontSize: body,
    fontWeight: regular,
    height: 1.50,
    letterSpacing: trackingBody,
  );

  /// 卡片正文、footer。
  static const TextStyle bodySmStyle = TextStyle(
    fontFamily: bodyFont,
    fontFamilyFallback: bodyFontFallback,
    fontSize: bodySm,
    fontWeight: regular,
    height: 1.50,
    letterSpacing: 0,
  );

  /// caption、meta、状态。
  static const TextStyle captionStyle = TextStyle(
    fontFamily: bodyFont,
    fontFamilyFallback: bodyFontFallback,
    fontSize: caption,
    fontWeight: regular,
    height: 1.40,
    letterSpacing: 0,
  );

  /// 所有按钮标签。
  static const TextStyle buttonStyle = TextStyle(
    fontFamily: bodyFont,
    fontFamilyFallback: bodyFontFallback,
    fontSize: button,
    fontWeight: medium,
    height: 1.20,
    letterSpacing: 0,
  );

  /// 区块 eyebrow（正字距，标记分类）。
  static const TextStyle eyebrowStyle = TextStyle(
    fontFamily: bodyFont,
    fontFamilyFallback: bodyFontFallback,
    fontSize: eyebrow,
    fontWeight: medium,
    height: 1.30,
    letterSpacing: trackingEyebrow,
  );

  /// branch name / commit id / label（JetBrains Mono）。
  static const TextStyle monoStyle = TextStyle(
    fontFamily: monoFont,
    fontFamilyFallback: monoFontFallback,
    fontSize: mono,
    fontWeight: medium,
    height: 1.50,
    letterSpacing: 0,
  );

  /// 小号等宽标签、时间戳（JetBrains Mono）。
  static const TextStyle monoSmStyle = TextStyle(
    fontFamily: monoFont,
    fontFamilyFallback: monoFontFallback,
    fontSize: monoSm,
    fontWeight: medium,
    height: 1.40,
    letterSpacing: 0,
  );

  // ════════════════════════════════════════════════════════════════
  // 旧别名兼容层（逐步迁移后可移除）
  // ════════════════════════════════════════════════════════════════

  // ─── 字体大小（旧）───
  @Deprecated('Use AppTypography.caption instead.')
  static const double xs = caption; // 11

  @Deprecated('Use AppTypography.bodySm instead.')
  static const double sm = bodySm; // 13

  @Deprecated('Use AppTypography.body instead.')
  static const double base = body; // 15

  @Deprecated('Use AppTypography.cardTitle or bodyLg instead.')
  static const double lg = cardTitle; // 17

  @Deprecated('Use AppTypography.subhead instead.')
  static const double xl = subhead; // 20（保留原 xl=20 语义）

  @Deprecated('Use AppTypography.headline instead.')
  static const double xxl = headline; // 24

  @Deprecated('Use AppTypography.displayMd instead.')
  static const double xxxl = displayMd; // 32

  // ─── 预设样式（旧）───
  @Deprecated('Use AppTypography.displayMdStyle instead.')
  static const TextStyle pageTitle = displayMdStyle;

  @Deprecated('Use AppTypography.headlineStyle instead.')
  static const TextStyle sectionTitle = headlineStyle;

  @Deprecated('Use AppTypography.cardTitleStyle instead.')
  static const TextStyle cardTitleLegacy = cardTitleStyle;

  @Deprecated('Use AppTypography.bodyStyle instead.')
  static const TextStyle bodyText = bodyStyle;

  @Deprecated('Use AppTypography.bodySmStyle instead.')
  static const TextStyle bodySmall = bodySmStyle;

  @Deprecated('Use AppTypography.monoSmStyle instead.')
  static const TextStyle label = monoSmStyle;

  /// 分支名（JetBrains Mono）。
  static const TextStyle branchName = monoStyle;

  /// 代码片段（JetBrains Mono）。
  static const TextStyle code = monoStyle;
}
