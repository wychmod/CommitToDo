import 'package:flutter/material.dart';

import '../../../core/theme/app_icons.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';

/// Toast 变体
enum ToastVariant {
  success,
  error,
  warning,
  info,
}

/// 通用 Toast
///
/// 对齐 `docs/DESIGN.md` §7.13。
/// - 底 surface3、`radiusMd`(8)、padding 12/16、左侧 3px 语义色条、bodySm。
/// - 底部浮出动画。
class AppToast {
  AppToast._();

  static void show(
    BuildContext context, {
    required String message,
    ToastVariant variant = ToastVariant.info,
    Duration duration = const Duration(seconds: 3),
  }) {
    final overlay = Overlay.of(context);
    late OverlayEntry entry;

    entry = OverlayEntry(
      builder: (context) => _ToastWidget(
        message: message,
        variant: variant,
        onDismiss: () => entry.remove(),
      ),
    );

    overlay.insert(entry);

    Future.delayed(duration, () {
      if (entry.mounted) {
        entry.remove();
      }
    });
  }
}

class _ToastWidget extends StatefulWidget {
  const _ToastWidget({
    required this.message,
    required this.variant,
    required this.onDismiss,
  });

  final String message;
  final ToastVariant variant;
  final VoidCallback onDismiss;

  @override
  State<_ToastWidget> createState() => _ToastWidgetState();
}

class _ToastWidgetState extends State<_ToastWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  Color get _accentColor {
    return switch (widget.variant) {
      ToastVariant.success => AppColors.success,
      ToastVariant.error => AppColors.error,
      ToastVariant.warning => AppColors.warning,
      ToastVariant.info => AppColors.info,
    };
  }

  AppIconName get _icon {
    return switch (widget.variant) {
      ToastVariant.success => AppIcons.checkCircleOutline,
      ToastVariant.error => AppIcons.error,
      ToastVariant.warning => AppIcons.warning,
      ToastVariant.info => AppIcons.info,
    };
  }

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: AppDimensions.animNormal,
      vsync: this,
    );
    _fadeAnimation = Tween<double>(begin: 0, end: 1).animate(_controller);
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 1),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: AppDimensions.easeOutQuart,
    ));
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // 底部留出底部导航栏高度 + 间距，避免遮挡导航。
    final bottomInset = AppDimensions.navItemHeight +
        AppDimensions.lg +
        AppDimensions.sm;
    return Positioned(
      bottom: bottomInset,
      left: AppDimensions.lg,
      right: AppDimensions.lg,
      child: SlideTransition(
        position: _slideAnimation,
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: Material(
            color: Colors.transparent,
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppDimensions.md,
                vertical: AppDimensions.sm,
              ),
              decoration: BoxDecoration(
                color: AppColors.surface3,
                borderRadius:
                    BorderRadius.circular(AppDimensions.radiusMd),
                border: Border(
                  left: BorderSide(
                    color: _accentColor,
                    width: AppDimensions.priorityStripWidth,
                  ),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  AppIcon(
                    _icon,
                    size: AppDimensions.iconMd,
                    color: _accentColor,
                  ),
                  const SizedBox(width: AppDimensions.sm),
                  Expanded(
                    child: Text(
                      widget.message,
                      style: AppTypography.bodySmStyle.copyWith(
                        color: AppColors.ink,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
