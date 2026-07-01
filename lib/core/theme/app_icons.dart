import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Heroicons 名称枚举。
///
/// 统一从这里映射 UI 图标，避免在界面层继续散落 Material Icons 占位。
enum AppIconName {
  repository,
  repositoryOpen,
  heatmap,
  graph,
  settings,
  add,
  edit,
  delete,
  search,
  back,
  close,
  more,
  chevronRight,
  checkCircle,
  checkCircleOutline,
  undo,
  calendar,
  fork,
  star,
  success,
  error,
  warning,
  info,
  darkMode,
  upload,
  download,
  deleteSweep,
  notifications,
  timer,
  description,
  feedback,
  zoomIn,
  zoomOut,
  reset,
  gitBranch,
  gitCommit,
  gitMerge,
}

/// 应用图标系统。
///
/// UI 层使用 [AppIcon] 渲染 Heroicons 风格 SVG，不再直接依赖
/// Material Icons。SVG 内联生成，避免额外维护大量图标资产文件。
class AppIcons {
  AppIcons._();

  static const AppIconName repository = AppIconName.repository;
  static const AppIconName repositoryOpen = AppIconName.repositoryOpen;
  static const AppIconName heatmap = AppIconName.heatmap;
  static const AppIconName graph = AppIconName.graph;
  static const AppIconName settings = AppIconName.settings;
  static const AppIconName add = AppIconName.add;
  static const AppIconName edit = AppIconName.edit;
  static const AppIconName delete = AppIconName.delete;
  static const AppIconName search = AppIconName.search;
  static const AppIconName back = AppIconName.back;
  static const AppIconName close = AppIconName.close;
  static const AppIconName more = AppIconName.more;
  static const AppIconName chevronRight = AppIconName.chevronRight;
  static const AppIconName checkCircle = AppIconName.checkCircle;
  static const AppIconName checkCircleOutline = AppIconName.checkCircleOutline;
  static const AppIconName undo = AppIconName.undo;
  static const AppIconName calendar = AppIconName.calendar;
  static const AppIconName fork = AppIconName.fork;
  static const AppIconName star = AppIconName.star;
  static const AppIconName success = AppIconName.success;
  static const AppIconName error = AppIconName.error;
  static const AppIconName warning = AppIconName.warning;
  static const AppIconName info = AppIconName.info;
  static const AppIconName darkMode = AppIconName.darkMode;
  static const AppIconName upload = AppIconName.upload;
  static const AppIconName download = AppIconName.download;
  static const AppIconName deleteSweep = AppIconName.deleteSweep;
  static const AppIconName notifications = AppIconName.notifications;
  static const AppIconName timer = AppIconName.timer;
  static const AppIconName description = AppIconName.description;
  static const AppIconName feedback = AppIconName.feedback;
  static const AppIconName zoomIn = AppIconName.zoomIn;
  static const AppIconName zoomOut = AppIconName.zoomOut;
  static const AppIconName reset = AppIconName.reset;
  static const AppIconName gitBranch = AppIconName.gitBranch;
  static const AppIconName gitCommit = AppIconName.gitCommit;
  static const AppIconName gitMerge = AppIconName.gitMerge;
}

/// 统一 Heroicons SVG 图标组件。
class AppIcon extends StatelessWidget {
  const AppIcon(
    this.name, {
    super.key,
    this.size = 20,
    this.color,
    this.semanticLabel,
  });

  final AppIconName name;
  final double size;
  final Color? color;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final iconColor = color ?? IconTheme.of(context).color ?? Colors.black;

    return SvgPicture.string(
      _svgFor(name),
      width: size,
      height: size,
      colorFilter: ColorFilter.mode(iconColor, BlendMode.srcIn),
      semanticsLabel: semanticLabel,
    );
  }

  static String _svgFor(AppIconName name) {
    final path = switch (name) {
      AppIconName.repository =>
        '<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V6.75A2.25 2.25 0 0 1 4.5 4.5h4.06c.6 0 1.17.24 1.59.66l1.19 1.18c.42.42.99.66 1.59.66h6.57a2.25 2.25 0 0 1 2.25 2.25v3.5m-19.5 0v3.75A2.25 2.25 0 0 0 4.5 18.75h15a2.25 2.25 0 0 0 2.25-2.25v-3.75m-19.5 0h19.5" />',
      AppIconName.repositoryOpen =>
        '<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 9.75V6.75A2.25 2.25 0 0 1 6 4.5h3.38c.6 0 1.17.24 1.59.66l.56.56c.42.42.99.66 1.59.66H18a2.25 2.25 0 0 1 2.25 2.25v1.12M3 10.5h18l-1.64 6.55A2.25 2.25 0 0 1 17.18 18.75H6.82a2.25 2.25 0 0 1-2.18-1.7L3 10.5Z" />',
      AppIconName.heatmap =>
        '<path stroke-linecap="round" stroke-linejoin="round" d="M15.36 5.21c.44 1.84-.15 3.24-1.3 4.56-.86.98-1.31 2.24-.9 3.48.28.85 1.01 1.55 1.89 1.55 1.64 0 2.95-1.5 2.95-3.36 0-2.44-1.56-4.5-2.64-6.23ZM9.1 3.75c.3 2.52-.42 4.16-1.83 5.8C6.16 10.84 5.25 12.34 5.25 14.4A5.25 5.25 0 0 0 10.5 19.65c2.9 0 5.25-2.35 5.25-5.25" />',
      AppIconName.graph =>
        '<path stroke-linecap="round" stroke-linejoin="round" d="M7.5 7.5h.01M16.5 7.5h.01M7.5 16.5h.01M16.5 16.5h.01M7.5 7.5v9m9-9v9m-9-9h9m-9 9h9" />',
      AppIconName.settings =>
        '<path stroke-linecap="round" stroke-linejoin="round" d="M9.59 3.2c.15-.9 1.46-.9 1.61 0l.13.78a1.5 1.5 0 0 0 2.24 1.03l.68-.4c.8-.47 1.72.45 1.25 1.25l-.4.68a1.5 1.5 0 0 0 1.03 2.24l.78.13c.9.15.9 1.46 0 1.61l-.78.13a1.5 1.5 0 0 0-1.03 2.24l.4.68c.47.8-.45 1.72-1.25 1.25l-.68-.4a1.5 1.5 0 0 0-2.24 1.03l-.13.78c-.15.9-1.46.9-1.61 0l-.13-.78a1.5 1.5 0 0 0-2.24-1.03l-.68.4c-.8.47-1.72-.45-1.25-1.25l.4-.68a1.5 1.5 0 0 0-1.03-2.24l-.78-.13c-.9-.15-.9-1.46 0-1.61l.78-.13A1.5 1.5 0 0 0 5.7 6.54l-.4-.68c-.47-.8.45-1.72 1.25-1.25l.68.4a1.5 1.5 0 0 0 2.24-1.03l.13-.78ZM10.4 12.9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />',
      AppIconName.add => '<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />',
      AppIconName.edit => '<path stroke-linecap="round" stroke-linejoin="round" d="m16.86 4.49 1.65-1.65a2.12 2.12 0 1 1 3 3L10.58 16.77a4.5 4.5 0 0 1-1.9 1.13L5.25 19l1.1-3.43a4.5 4.5 0 0 1 1.13-1.9L16.86 4.49Z" />',
      AppIconName.delete => '<path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.35 9m-4.78 0L9.26 9m9.97-3.21c.34.05.68.1 1.02.17m-1.02-.17L18.16 19.67A2.25 2.25 0 0 1 15.92 21.75H8.08a2.25 2.25 0 0 1-2.24-2.08L4.77 5.79m14.46 0a48.1 48.1 0 0 0-3.48-.36m-10.98.36c-.34.05-.68.1-1.02.17m1.02-.17a48.1 48.1 0 0 1 3.48-.36m7.5 0V4.88c0-1.18-.91-2.16-2.09-2.2a51 51 0 0 0-3.32 0c-1.18.04-2.09 1.02-2.09 2.2v.55m7.5 0a49 49 0 0 0-7.5 0" />',
      AppIconName.search => '<path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.2-5.2m0 0A7.5 7.5 0 1 0 5.2 5.2a7.5 7.5 0 0 0 10.6 10.6Z" />',
      AppIconName.back => '<path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />',
      AppIconName.close => '<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />',
      AppIconName.more => '<path stroke-linecap="round" stroke-linejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm6 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm6 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />',
      AppIconName.chevronRight => '<path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />',
      AppIconName.checkCircle => '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />',
      AppIconName.checkCircleOutline => '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />',
      AppIconName.undo => '<path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />',
      AppIconName.calendar => '<path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5A2.25 2.25 0 0 1 5.25 5.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />',
      AppIconName.fork => '<path stroke-linecap="round" stroke-linejoin="round" d="M6 3.75v6a3 3 0 0 0 3 3h6m0 0-3-3m3 3-3 3M18 3.75v16.5" />',
      AppIconName.star => '<path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.5a.56.56 0 0 1 1.04 0l2.13 5.1a.56.56 0 0 0 .47.34l5.51.44a.56.56 0 0 1 .32.99l-4.2 3.6a.56.56 0 0 0-.18.55l1.28 5.38a.56.56 0 0 1-.84.61l-4.72-2.88a.56.56 0 0 0-.58 0l-4.72 2.88a.56.56 0 0 1-.84-.61l1.28-5.38a.56.56 0 0 0-.18-.55l-4.2-3.6a.56.56 0 0 1 .32-.99l5.51-.44a.56.56 0 0 0 .47-.34l2.13-5.1Z" />',
      AppIconName.success => '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />',
      AppIconName.error => '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0 3.75h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />',
      AppIconName.warning => '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0 3.75h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />',
      AppIconName.info => '<path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.04-.02a.75.75 0 0 1 1.06.85l-.72 2.87a.75.75 0 0 0 1.06.85l.04-.02M12 7.5h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />',
      AppIconName.darkMode => '<path stroke-linecap="round" stroke-linejoin="round" d="M21.75 15.75A9.75 9.75 0 0 1 8.25 2.25 7.5 7.5 0 1 0 21.75 15.75Z" />',
      AppIconName.upload => '<path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V3.75m0 0L7.5 8.25M12 3.75l4.5 4.5M3.75 16.5v2.25A2.25 2.25 0 0 0 6 21h12a2.25 2.25 0 0 0 2.25-2.25V16.5" />',
      AppIconName.download => '<path stroke-linecap="round" stroke-linejoin="round" d="M12 3.75V16.5m0 0 4.5-4.5M12 16.5 7.5 12M3.75 16.5v2.25A2.25 2.25 0 0 0 6 21h12a2.25 2.25 0 0 0 2.25-2.25V16.5" />',
      AppIconName.deleteSweep => '<path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9 14.4 18m-4.78 0L9.26 9M4.77 5.79 5.84 19.67A2.25 2.25 0 0 0 8.08 21.75h7.84a2.25 2.25 0 0 0 2.24-2.08l1.07-13.88M9.75 5.43V4.88c0-1.18.91-2.16 2.09-2.2h.32c1.18.04 2.09 1.02 2.09 2.2v.55M4.5 5.79h15" />',
      AppIconName.notifications => '<path stroke-linecap="round" stroke-linejoin="round" d="M14.86 17.08a2.25 2.25 0 0 1-4.24 0M18.75 8.25a6.75 6.75 0 0 0-13.5 0c0 7.88-3 8.63-3 8.63h19.5s-3-.75-3-8.63Z" />',
      AppIconName.timer => '<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2m5-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />',
      AppIconName.description => '<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.63a3.38 3.38 0 0 0-.99-2.39L13.27 3.99A3.38 3.38 0 0 0 10.88 3H6.75A2.25 2.25 0 0 0 4.5 5.25v13.5A2.25 2.25 0 0 0 6.75 21h10.5a2.25 2.25 0 0 0 2.25-2.25v-4.5ZM12 3v4.5A2.25 2.25 0 0 0 14.25 9.75h4.5" />',
      AppIconName.feedback => '<path stroke-linecap="round" stroke-linejoin="round" d="M8.63 9.75h6.74M8.63 13.5h3.74M21 12c0 4.56-4.03 8.25-9 8.25a9.8 9.8 0 0 1-3.91-.79L3 20.25l1.48-3.94A7.92 7.92 0 0 1 3 12c0-4.56 4.03-8.25 9-8.25s9 3.69 9 8.25Z" />',
      AppIconName.zoomIn => '<path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.2-5.2m0 0A7.5 7.5 0 1 0 5.2 5.2a7.5 7.5 0 0 0 10.6 10.6ZM10.5 7.5v6m3-3h-6" />',
      AppIconName.zoomOut => '<path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.2-5.2m0 0A7.5 7.5 0 1 0 5.2 5.2a7.5 7.5 0 0 0 10.6 10.6ZM7.5 10.5h6" />',
      AppIconName.reset => '<path stroke-linecap="round" stroke-linejoin="round" d="M16.02 9.35h4.13V5.22M19.6 9.2A8.25 8.25 0 1 0 21 13.8" />',
      AppIconName.gitBranch => '<path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5ZM7.5 7.5a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5ZM16.5 7.5a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5ZM7.5 16.5v-9m9 0c0 4.5-9 3-9 9" />',
      AppIconName.gitCommit => '<path stroke-linecap="round" stroke-linejoin="round" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 12h6m6 0h6" />',
      AppIconName.gitMerge => '<path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5ZM7.5 16.5V7.5m0 0a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Zm0 0c0 3 6 3 9 6" />',
    };

    return '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">$path</svg>';
  }
}
