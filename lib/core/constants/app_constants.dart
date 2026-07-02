/// 应用常量定义
class AppConstants {
  AppConstants._();

  /// 应用名称
  static const String appName = 'Commit';

  /// 应用版本
  static const String appVersion = '1.0.0';

  /// 任务标题最大长度
  static const int maxTaskTitleLength = 100;

  /// 任务描述最大长度
  static const int maxTaskDescriptionLength = 2000;

  /// 仓库名称最大长度
  static const int maxRepositoryNameLength = 50;

  /// 分支名称最大长度
  static const int maxBranchNameLength = 30;

  /// 搜索结果最大数量
  static const int maxSearchResults = 50;

  /// 热力图显示周数
  static const int heatmapWeeks = 53;

  /// 热力图单元格大小
  static const double heatmapCellSize = 14.0;

  /// Git Graph 节点半径
  static const double graphNodeRadius = 6.0;

  /// Git Graph 行高
  static const double graphRowHeight = 40.0;

  /// Git Graph 列宽
  static const double graphColumnWidth = 20.0;

  /// 提前提醒时间（小时）
  static const int reminderHoursBefore = 1;

  /// 页面切换动画时长（毫秒）
  static const int pageTransitionDuration = 300;
}
