import 'package:flutter/material.dart';

import 'dart:ui';
import '../../../core/constants/app_constants.dart';
import '../../../core/theme/colors.dart';
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
}

/// Git Graph 绘制器
class GitGraphPainter extends CustomPainter {
  GitGraphPainter({
    required this.nodes,
    required this.branchColors,
    this.selectedNodeId,
  });

  final List<CommitNode> nodes;
  final Map<String, Color> branchColors;
  final String? selectedNodeId;

  @override
  void paint(Canvas canvas, Size size) {
    final nodeRadius = AppConstants.graphNodeRadius;
    final rowHeight = AppConstants.graphRowHeight;
    final columnWidth = AppConstants.graphColumnWidth;

    for (var i = 0; i < nodes.length; i++) {
      final node = nodes[i];
      final x = node.column * columnWidth + nodeRadius + 10;
      final y = i * rowHeight + nodeRadius + 10;

      // 绘制连接线
      for (final parent in node.parents) {
        final parentIndex = nodes.indexOf(parent);
        if (parentIndex >= 0) {
          final parentX =
              parent.column * columnWidth + nodeRadius + 10;
          final parentY =
              parentIndex * rowHeight + nodeRadius + 10;

          final linePaint = Paint()
            ..color = branchColors[node.branchId] ??
                AppColors.textTertiary
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
      final nodeColor = branchColors[node.branchId] ??
          AppColors.textTertiary;
      final nodePaint = Paint()..color = nodeColor;

      canvas.drawCircle(
        Offset(x, y),
        nodeRadius,
        nodePaint,
      );

      // 选中状态：外圈描边
      if (node.id == selectedNodeId) {
        final borderPaint = Paint()
          ..color = AppColors.textPrimary
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
        style: const TextStyle(
          fontFamily: AppTypography.monoFont,
          fontSize: AppTypography.sm,
          color: AppColors.textSecondary,
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
        selectedNodeId != oldDelegate.selectedNodeId;
  }
}
