import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme_colors.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';
import '../../widgets/common/app_bar_widget.dart';
import '../../widgets/common/app_card.dart';
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
    final colors = AppThemeColors.of(context);
    final isMobile = MediaQuery.sizeOf(context).width <
        AppDimensions.mobileBreakpoint;
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
      'main': AppColors.branchColor(0),
      'feature': AppColors.branchColor(1),
    };

    final boundaryMargin = EdgeInsets.all(
      (isMobile ? AppDimensions.xxl : AppDimensions.section) +
          AppDimensions.xxs,
    );

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(
          maxWidth: AppDimensions.contentMaxWidth,
        ),
        child: Column(
          children: [
            // 展示面标题
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppDimensions.md,
                AppDimensions.md,
                AppDimensions.md,
                AppDimensions.sm,
              ),
              child: Row(
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '数据',
                        style: AppTypography.eyebrowStyle.copyWith(
                          color: colors.inkSubtle,
                        ),
                      ),
                      ShaderMask(
                        shaderCallback: (bounds) => LinearGradient(
                          colors: colors.primaryGradient,
                        ).createShader(bounds),
                        child: Text(
                          'Git Graph',
                          style: AppTypography.displayMdStyle.copyWith(
                            color: colors.onPrimary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Graph 区域
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppDimensions.md,
                ),
                child: Container(
                  padding: const EdgeInsets.all(AppDimensions.lg),
                  decoration: BoxDecoration(
                    color: colors.canvas,
                    borderRadius:
                        BorderRadius.circular(AppDimensions.radiusXl),
                    border: Border.all(color: colors.hairline),
                  ),
                  child: Stack(
                    children: [
                      InteractiveViewer(
                        transformationController: _transformationController,
                        boundaryMargin: boundaryMargin,
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
                            themeColors: colors,
                            selectedNodeId: _selectedNodeId,
                          ),
                          size: Size(
                            400,
                            nodes.length * AppConstants.graphRowHeight + 20,
                          ),
                        ),
                      ),
                      Positioned(
                        right: 0,
                        bottom: 0,
                        child: _buildZoomControls(),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // 节点详情面板
            if (_selectedNodeId != null)
              _buildDetailPanel(nodes),
          ],
        ),
      ),
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
    final colors = AppThemeColors.of(context);
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
        borderRadius: BorderRadius.circular(AppDimensions.radiusFull),
        child: Container(
          width: AppDimensions.tapTargetMin,
          height: AppDimensions.tapTargetMin,
          decoration: BoxDecoration(
            color: colors.surface1,
            shape: BoxShape.circle,
            border: Border.all(color: colors.hairline),
          ),
          child: AppIcon(
            icon,
            size: AppDimensions.iconSm,
            color: colors.ink,
          ),
        ),
      ),
    );
  }

  Widget _buildZoomControls() {
    final colors = AppThemeColors.of(context);
    return AppCard(
      padding: const EdgeInsets.all(AppDimensions.xs),
      radius: AppDimensions.radiusFull,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildZoomButton(AppIcons.zoomOut, _zoomOut),
          const SizedBox(width: AppDimensions.xs),
          Text(
            '${(_scale * 100).toInt()}%',
            style: AppTypography.monoSmStyle.copyWith(
              color: colors.inkMuted,
            ),
          ),
          const SizedBox(width: AppDimensions.xs),
          _buildZoomButton(AppIcons.zoomIn, _zoomIn),
          const SizedBox(width: AppDimensions.xs),
          _buildZoomButton(AppIcons.reset, _resetZoom),
        ],
      ),
    );
  }

  Widget _buildDetailPanel(List<CommitNode> nodes) {
    final colors = AppThemeColors.of(context);
    final selected = nodes.firstWhere(
      (n) => n.id == _selectedNodeId,
      orElse: () => nodes.first,
    );

    return Container(
      padding: const EdgeInsets.all(AppDimensions.md),
      decoration: BoxDecoration(
        color: colors.surface1,
        border: Border(
          top: BorderSide(color: colors.hairline),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '提交: ${selected.message}',
            style: AppTypography.bodyStyle.copyWith(
              fontWeight: AppTypography.medium,
              color: colors.ink,
            ),
          ),
          const SizedBox(height: AppDimensions.xs),
          Text(
            '分支: ${selected.branchId}',
            style: AppTypography.monoSmStyle.copyWith(
              color: colors.inkMuted,
            ),
          ),
        ],
      ),
    );
  }
}
