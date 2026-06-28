import '../constants/app_constants.dart';

/// 输入验证器
class Validators {
  Validators._();

  /// 验证仓库名称
  static String? validateRepositoryName(String? value) {
    if (value == null || value.trim().isEmpty) {
      return '请输入仓库名称';
    }
    if (value.trim().length > AppConstants.maxRepositoryNameLength) {
      return '仓库名称不能超过 ${AppConstants.maxRepositoryNameLength} 个字符';
    }
    return null;
  }

  /// 验证分支名称
  static String? validateBranchName(String? value) {
    if (value == null || value.trim().isEmpty) {
      return '请输入分支名称';
    }
    if (value.trim().length > AppConstants.maxBranchNameLength) {
      return '分支名称不能超过 ${AppConstants.maxBranchNameLength} 个字符';
    }
    if (value.trim().contains(' ')) {
      return '分支名称不能包含空格';
    }
    return null;
  }

  /// 验证任务标题
  static String? validateTaskTitle(String? value) {
    if (value == null || value.trim().isEmpty) {
      return '请输入任务标题';
    }
    if (value.trim().length > AppConstants.maxTaskTitleLength) {
      return '任务标题不能超过 ${AppConstants.maxTaskTitleLength} 个字符';
    }
    return null;
  }

  /// 验证任务描述
  static String? validateTaskDescription(String? value) {
    if (value != null &&
        value.trim().length > AppConstants.maxTaskDescriptionLength) {
      return '任务描述不能超过 ${AppConstants.maxTaskDescriptionLength} 个字符';
    }
    return null;
  }
}
