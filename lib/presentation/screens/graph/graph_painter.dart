import 'dart:ui';

import 'package:flutter/material.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/theme/app_theme_colors.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';

/// Git Graph 节点数据
class CommitNode {
  const CommitNode({
    required this.id,
    required this.branchId,
    required this.message,
    required this.column,
    this.parents = const [],
  });

  final String id;
  final String branchId;
  final String message;
  final int column;
  final List<CommitNode> parents;

  /// 节点按 id 判等，避免重新构建列表时 `indexOf(parent)` 失败。
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CommitNode && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;
}

/// Git Graph 绘制器
class GitGraphPainter extends CustomPainter {
  GitGraphPainter({
    required this.nodes,
    required this.branchColors,
    required this.themeColors,
    this.selectedNodeId,
  });

  final List<CommitNode> nodes;
  final Map<String, Color> branchColors;

  /// 主题语义色（surface/ink/hairline），由调用方按浅/深模式传入，
  /// 避免 painter 直接引用深色常量导致浅色模式配色错乱。
  final AppThemeColors themeColors;
  final String? selectedNodeId;

  @override
  void paint(Canvas canvas, Size size) {
    const nodeRadius = AppDimensions.dotMd;
    final rowHeight = AppConstants.graphRowHeight;
    final columnWidth = AppConstants.graphColumnWidth;

    // 预建 id → index 索引，O(1) 查父节点行号。
    final indexById = <String, int>{
      for (var i = 0; i < nodes.length; i++) nodes[i].id: i,
    };

    for (var i = 0; i < nodes.length; i++) {
      final node = nodes[i];
      final x = node.column * columnWidth + nodeRadius + 10;
      final y = i * rowHeight + nodeRadius + 10;

      // 绘制连接线
      for (final parent in node.parents) {
        final parentIndex = indexById[parent.id];
        if (parentIndex != null && parentIndex >= 0) {
          final parentX =
              parent.column * columnWidth + nodeRadius + 10;
          final parentY =
              parentIndex * rowHeight + nodeRadius + 10;

          final linePaint = Paint()
            ..color = branchColors[node.branchId] ??
                themeColors.inkSubtle
            ..strokeWidth = 2
            ..style = PaintingStyle.stroke;

          final path = Path()
            ..moveTo(x, y)
            ..cubicTo(
              x,
              y + rowHeight / 2,
              parentX,
              parentY - rowHeight / 2,
              parentX,
              parentY,
            );

          canvas.drawPath(path, linePaint);
        }
      }

      // 绘制节点
      final isMerge = node.parents.length > 1;
      final nodeColor = isMerge
          ? AppColors.primary
          : branchColors[node.branchId] ??
          themeColors.inkSubtle;
      final nodePaint = Paint()..color = nodeColor;
      final innerPaint = Paint()..color = themeColors.canvas;

      canvas.drawCircle(
        Offset(x, y),
        nodeRadius,
        nodePaint,
      );
      canvas.drawCircle(
        Offset(x, y),
        nodeRadius - AppDimensions.priorityStripWidth,
        innerPaint,
      );

      // 选中状态：外圈描边
      if (node.id == selectedNodeId) {
        final borderPaint = Paint()
          ..color = themeColors.ink
          ..strokeWidth = 2
          ..style = PaintingStyle.stroke;
        canvas.drawCircle(
          Offset(x, y),
          nodeRadius + 2,
          borderPaint,
        );
      }

      // 绘制提交信息
      final textSpan = TextSpan(
        text: _truncateMessage(node.message, 40),
        style: AppTypography.monoSmStyle.copyWith(
          color: themeColors.inkMuted,
        ),
      );
      final textPainter = TextPainter(
        text: textSpan,
        textDirection: TextDirection.ltr,
        maxLines: 1,
      );

      textPainter.layout();
      textPainter.paint(
        canvas,
        Offset(
          x + nodeRadius + 8,
          y - textPainter.height / 2,
        ),
      );
    }
  }

  String _truncateMessage(String message, int maxLength) {
    if (message.length <= maxLength) return message;
    return '${message.substring(0, maxLength)}...';
  }

  @override
  bool shouldRepaint(
    covariant GitGraphPainter oldDelegate,
  ) {
    return nodes != oldDelegate.nodes ||
        selectedNodeId != oldDelegate.selectedNodeId ||
        themeColors != oldDelegate.themeColors;
  }
}
