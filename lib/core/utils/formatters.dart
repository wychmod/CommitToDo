import 'package:intl/intl.dart';

/// 格式化工具
class Formatters {
  Formatters._();

  /// 格式化日期为 yyyy-MM-dd
  static String formatDate(DateTime date) {
    return DateFormat('yyyy-MM-dd').format(date);
  }

  /// 格式化日期为 yyyy-MM-dd HH:mm
  static String formatDateTime(DateTime date) {
    return DateFormat('yyyy-MM-dd HH:mm').format(date);
  }

  /// 格式化日期为 MM/dd
  static String formatShortDate(DateTime date) {
    return DateFormat('MM/dd').format(date);
  }

  /// 格式化日期为 HH:mm
  static String formatTime(DateTime date) {
    return DateFormat('HH:mm').format(date);
  }

  /// 格式化任务数量
  static String formatTaskCount(int count) {
    if (count == 0) return '无任务';
    return '$count 任务';
  }

  /// 格式化百分比
  static String formatPercentage(double value) {
    return '${(value * 100).toStringAsFixed(0)}%';
  }

  /// 截断文本
  static String truncateText(String text, int maxLength) {
    if (text.length <= maxLength) return text;
    return '${text.substring(0, maxLength)}...';
  }
}
