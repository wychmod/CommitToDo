import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_icons.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';
import '../../widgets/common/app_bar_widget.dart';
import 'graph_painter.dart';

/// Git Graph 页
class GitGraphScreen extends ConsumerStatefulWidget {
  const GitGraphScreen({super.key});

  @override
  ConsumerState<GitGraphScreen> createState() =>
      _GitGraphScreenState();
}

class _GitGraphScreenState
    extends ConsumerState<GitGraphScreen> {
  static const double _minScale = 0.5;
  static const double _maxScale = 2.0;
  static const double _scaleStep = 0.1;

  final TransformationController _transformationController =
      TransformationController();
  double _scale = 1.0;
  String? _selectedNodeId;

  @override
  void dispose() {
    _transformationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const AppBarWidget(title: 'Git Graph'),
      body: _buildContent(),
    );
  }

  Widget _buildContent() {
    // 示例节点数据
    final nodes = [
      CommitNode(
        id: '1',
        branchId: 'main',
        message: '初始化项目',
        column: 0,
      ),
      CommitNode(
        id: '2',
        branchId: 'main',
        message: '添加用户认证功能',
        column: 0,
        parents: [],
      ),
      CommitNode(
        id: '3',
        branchId: 'feature',
        message: '数据库架构设计',
        column: 1,
      ),
      CommitNode(
        id: '4',
        branchId: 'feature',
        message: '添加索引优化',
        column: 1,
      ),
      CommitNode(
        id: '5',
        branchId: 'main',
        message: '合并 feature 分支',
        column: 0,
      ),
    ];

    // 设置父节点引用
    nodes[1] = CommitNode(
      id: nodes[1].id,
      branchId: nodes[1].branchId,
      message: nodes[1].message,
      column: nodes[1].column,
      parents: [nodes[0]],
    );
    nodes[2] = CommitNode(
      id: nodes[2].id,
      branchId: nodes[2].branchId,
      message: nodes[2].message,
      column: nodes[2].column,
      parents: [nodes[0]],
    );
    nodes[3] = CommitNode(
      id: nodes[3].id,
      branchId: nodes[3].branchId,
      message: nodes[3].message,
      column: nodes[3].column,
      parents: [nodes[2]],
    );
    nodes[4] = CommitNode(
      id: nodes[4].id,
      branchId: nodes[4].branchId,
      message: nodes[4].message,
      column: nodes[4].column,
      parents: [nodes[1], nodes[3]],
    );

    final branchColors = {
      'main': AppColors.branchColors[0],
      'feature': AppColors.branchColors[1],
    };

    return Column(
      children: [
        // 缩放控制
        Padding(
          padding: const EdgeInsets.all(AppDimensions.base),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              _buildZoomButton(AppIcons.zoomOut, _zoomOut),
              const SizedBox(width: AppDimensions.sm),
              Text(
                '${(_scale * 100).toInt()}%',
                style: const TextStyle(
                  fontFamily: AppTypography.monoFont,
                  fontSize: AppTypography.sm,
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(width: AppDimensions.sm),
              _buildZoomButton(AppIcons.zoomIn, _zoomIn),
              const SizedBox(width: AppDimensions.sm),
              _buildZoomButton(AppIcons.reset, _resetZoom),
            ],
          ),
        ),

        // Graph 区域
        Expanded(
          child: InteractiveViewer(
            transformationController: _transformationController,
            boundaryMargin: const EdgeInsets.all(100),
            minScale: _minScale,
            maxScale: _maxScale,
            onInteractionUpdate: (details) {
              setState(() {
                _scale = _transformationController.value
                    .getMaxScaleOnAxis()
                    .clamp(_minScale, _maxScale);
              });
            },
            child: CustomPaint(
              painter: GitGraphPainter(
                nodes: nodes,
                branchColors: branchColors,
                selectedNodeId: _selectedNodeId,
              ),
              size: Size(
                400,
                nodes.length * AppConstants.graphRowHeight + 20,
              ),
            ),
          ),
        ),

        // 节点详情面板
        if (_selectedNodeId != null)
          _buildDetailPanel(nodes),
      ],
    );
  }

  void _zoomIn() => _setScale(_scale + _scaleStep);

  void _zoomOut() => _setScale(_scale - _scaleStep);

  void _resetZoom() => _setScale(1);

  void _setScale(double value) {
    final nextScale = value.clamp(_minScale, _maxScale);
    setState(() {
      _scale = nextScale;
      _transformationController.value = Matrix4.identity()
        ..scale(nextScale);
    });
  }

  Widget _buildZoomButton(
    AppIconName icon,
    VoidCallback onPressed,
  ) {
    return Semantics(
      button: true,
      label: switch (icon) {
        AppIconName.zoomIn => '放大 Git Graph',
        AppIconName.zoomOut => '缩小 Git Graph',
        AppIconName.reset => '重置 Git Graph 缩放',
        _ => 'Git Graph 操作',
      },
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(AppDimensions.radiusMd),
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: AppColors.bgElevated,
            borderRadius: BorderRadius.circular(
              AppDimensions.radiusMd,
            ),
            border: Border.all(
              color: AppColors.borderDefault,
            ),
          ),
          child: AppIcon(
            icon,
            size: 20,
            color: AppColors.textPrimary,
          ),
        ),
      ),
    );
  }

  Widget _buildDetailPanel(List<CommitNode> nodes) {
    final selected = nodes.firstWhere(
      (n) => n.id == _selectedNodeId,
      orElse: () => nodes.first,
    );

    return Container(
      padding: const EdgeInsets.all(AppDimensions.base),
      decoration: const BoxDecoration(
        color: AppColors.bgElevated,
        border: Border(
          top: BorderSide(color: AppColors.borderSubtle),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '提交: ${selected.message}',
            style: const TextStyle(
              fontFamily: AppTypography.bodyFont,
              fontSize: AppTypography.base,
              fontWeight: AppTypography.medium,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: AppDimensions.xs),
          Text(
            '分支: ${selected.branchId}',
            style: const TextStyle(
              fontFamily: AppTypography.monoFont,
              fontSize: AppTypography.sm,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}
