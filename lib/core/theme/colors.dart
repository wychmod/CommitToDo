import 'dart:ui';

/// 应用颜色常量
class AppColors {
  AppColors._();

  // ─── 基础色板 ───
  static const Color primary = Color(0xFF3B82F6);
  static const Color primaryHover = Color(0xFF2563EB);
  static const Color primaryLight = Color(0xFF60A5FA);
  static const Color primaryDark = Color(0xFF1D4ED8);

  // ─── 深色背景系统 ───
  static const Color bgBase = Color(0xFF0F172A);
  static const Color bgElevated = Color(0xFF1E293B);
  static const Color bgOverlay = Color(0xFF334155);
  static const Color bgSurface = Color(0xFF0F172A);

  // ─── 文字色 ───
  static const Color textPrimary = Color(0xFFF1F5F9);
  static const Color textSecondary = Color(0xFF94A3B8);
  static const Color textTertiary = Color(0xFF64748B);
  static const Color textDisabled = Color(0xFF475569);

  // ─── 边框色 ───
  static const Color borderSubtle = Color(0xFF1E293B);
  static const Color borderDefault = Color(0xFF334155);
  static const Color borderFocus = Color(0xFF3B82F6);

  // ─── 语义色 ───
  static const Color success = Color(0xFF10B981);
  static const Color successLight = Color(0xFF34D399);
  static const Color warning = Color(0xFFF59E0B);
  static const Color warningLight = Color(0xFFFBBF24);
  static const Color error = Color(0xFFEF4444);
  static const Color errorLight = Color(0xFFF87171);
  static const Color info = Color(0xFF3B82F6);

  // ─── 优先级色 ───
  static const Color priorityHigh = Color(0xFFEF4444);
  static const Color priorityMedium = Color(0xFFF59E0B);
  static const Color priorityLow = Color(0xFF10B981);

  // ─── 任务状态色 ───
  static const Color statusTodo = Color(0xFF94A3B8);
  static const Color statusInProgress = Color(0xFF3B82F6);
  static const Color statusDone = Color(0xFF10B981);
  static const Color statusCancelled = Color(0xFF6B7280);

  // ─── 热力图色阶 ───
  static const Color heatmapEmpty = Color(0xFF1E293B);
  static const Color heatmapLevel1 = Color(0xFF064E3B);
  static const Color heatmapLevel2 = Color(0xFF065F46);
  static const Color heatmapLevel3 = Color(0xFF047857);
  static const Color heatmapLevel4 = Color(0xFF10B981);

  // ─── Git Graph 分支色 ───
  static const List<Color> branchColors = [
    Color(0xFF3B82F6),
    Color(0xFF8B5CF6),
    Color(0xFFF59E0B),
    Color(0xFF10B981),
    Color(0xFFEC4899),
    Color(0xFF06B6D4),
    Color(0xFFF97316),
  ];
}
