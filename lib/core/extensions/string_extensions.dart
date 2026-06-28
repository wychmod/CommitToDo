/// 字符串扩展方法
extension StringExtensions on String {
  /// 是否为空或仅包含空白
  bool get isBlankOrEmpty => trim().isEmpty;

  /// 是否不为空且不全空白
  bool get isNotBlank => trim().isNotEmpty;

  /// 截断到指定长度，超出部分用省略号
  String truncate(int maxLength, {String suffix = '...'}) {
    if (length <= maxLength) return this;
    return '${substring(0, maxLength)}$suffix';
  }

  /// 首字母大写
  String get capitalize {
    if (isEmpty) return this;
    return '${this[0].toUpperCase()}${substring(1)}';
  }

  /// 驼峰转下划线
  String get camelToSnake {
    return replaceAllMapped(
      RegExp('[A-Z]'),
      (match) => '_${match.group(0)!.toLowerCase()}',
    );
  }

  /// 下划线转驼峰
  String get snakeToCamel {
    return replaceAllMapped(
      RegExp('_([a-z])'),
      (match) => match.group(1)!.toUpperCase(),
    );
  }

  /// 是否为有效十六进制颜色
  bool get isValidHexColor {
    return RegExp(r'^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$').hasMatch(this);
  }
}
