import 'package:intl/intl.dart';

/// 日期扩展方法
extension DateTimeExtensions on DateTime {
  /// 格式化为 yyyy-MM-dd
  String get toDateStr => DateFormat('yyyy-MM-dd').format(this);

  /// 格式化为 yyyy-MM-dd HH:mm
  String get toDateTimeStr => DateFormat('yyyy-MM-dd HH:mm').format(this);

  /// 格式化为 MM-dd HH:mm
  String get toShortDateTimeStr => DateFormat('MM-dd HH:mm').format(this);

  /// 是否是今天
  bool get isToday {
    final now = DateTime.now();
    return year == now.year && month == now.month && day == now.day;
  }

  /// 是否是昨天
  bool get isYesterday {
    final yesterday = DateTime.now().subtract(const Duration(days: 1));
    return year == yesterday.year &&
        month == yesterday.month &&
        day == yesterday.day;
  }

  /// 是否是本周
  bool get isThisWeek {
    final now = DateTime.now();
    final startOfWeek = now.subtract(Duration(days: now.weekday - 1));
    final endOfWeek = startOfWeek.add(const Duration(days: 6));
    return isAfter(startOfWeek.subtract(const Duration(days: 1))) &&
        isBefore(endOfWeek.add(const Duration(days: 1)));
  }

  /// 相对时间描述
  String get relativeTime {
    final now = DateTime.now();
    final diff = now.difference(this);

    if (diff.inSeconds < 60) return '刚刚';
    if (diff.inMinutes < 60) return '${diff.inMinutes} 分钟前';
    if (diff.inHours < 24) return '${diff.inHours} 小时前';
    if (diff.inDays < 7) return '${diff.inDays} 天前';
    if (diff.inDays < 30) return '${(diff.inDays / 7).floor()} 周前';
    if (diff.inDays < 365) return '${(diff.inDays / 30).floor()} 个月前';
    return '${(diff.inDays / 365).floor()} 年前';
  }

  /// 只取日期部分（时分秒归零）
  DateTime get dateOnly => DateTime(year, month, day);
}
