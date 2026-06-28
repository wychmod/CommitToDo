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

  Color get _iconColor {
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
    _fadeAnimation = Tween<double>(begin: 0, end: 1)
        .animate(_controller);
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
    return Positioned(
      bottom: 100,
      left: 40,
      right: 40,
      child: SlideTransition(
        position: _slideAnimation,
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: Material(
            color: Colors.transparent,
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppDimensions.base,
                vertical: AppDimensions.md,
              ),
              decoration: BoxDecoration(
                color: AppColors.bgOverlay,
                borderRadius: BorderRadius.circular(
                  AppDimensions.radiusMd,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  AppIcon(
                    _icon,
                    size: 20,
                    color: _iconColor,
                  ),
                  const SizedBox(width: AppDimensions.sm),
                  Expanded(
                    child: Text(
                      widget.message,
                      style: const TextStyle(
                        fontSize: AppTypography.base,
                        color: AppColors.textPrimary,
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
