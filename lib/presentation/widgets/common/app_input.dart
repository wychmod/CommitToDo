import 'package:flutter/material.dart';

import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';

/// 通用输入框
///
/// 对齐 `docs/DESIGN.md` §7.4。
/// - 底 surface1、`radiusMd`(8)、padding 10/12、1px hairlineStrong。
/// - focus ring：2px primaryFocus @ 50% opacity（包裹层实现）。
/// - label 用 eyebrow + inkMuted。
/// - error：1px error + 下方 caption error 提示。
class AppInput extends StatelessWidget {
  const AppInput({
    super.key,
    this.controller,
    this.label,
    this.hint,
    this.errorText,
    this.maxLines = 1,
    this.onChanged,
    this.onSubmitted,
    this.validator,
    this.focusNode,
    this.autofocus = false,
    this.enabled = true,
    this.prefixIcon,
    this.suffixIcon,
    this.obscureText = false,
    this.keyboardType,
  });

  final TextEditingController? controller;
  final String? label;
  final String? hint;
  final String? errorText;
  final int maxLines;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final FormFieldValidator<String>? validator;
  final FocusNode? focusNode;
  final bool autofocus;
  final bool enabled;
  final Widget? prefixIcon;
  final Widget? suffixIcon;
  final bool obscureText;
  final TextInputType? keyboardType;

  @override
  Widget build(BuildContext context) {
    final hasError = errorText != null && errorText!.isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (label != null) ...[
          Text(
            label!,
            style: AppTypography.eyebrowStyle.copyWith(
              color: AppColors.inkMuted,
            ),
          ),
          const SizedBox(height: AppDimensions.xs),
        ],
        _FocusRingField(
          enabled: enabled,
          hasError: hasError,
          focusNode: focusNode,
          child: TextFormField(
            controller: controller,
            focusNode: focusNode,
            onChanged: onChanged,
            onSubmitted: onSubmitted,
            validator: validator,
            autofocus: autofocus,
            enabled: enabled,
            obscureText: obscureText,
            keyboardType: keyboardType,
            maxLines: maxLines,
            style: AppTypography.bodyStyle.copyWith(
              color: enabled ? AppColors.ink : AppColors.inkSubtle,
            ),
            cursorColor: AppColors.primary,
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: AppTypography.bodyStyle.copyWith(
                color: AppColors.inkSubtle,
              ),
              prefixIcon: prefixIcon,
              suffixIcon: suffixIcon,
              filled: true,
              fillColor: enabled ? AppColors.surface1 : AppColors.surface2,
              isDense: true,
              // 边框统一由 theme 的 inputDecorationTheme 提供基础态，
              // focus ring 由外层 _FocusRingField 包裹层绘制，避免双重覆盖。
              contentPadding: const EdgeInsets.symmetric(
                horizontal: AppDimensions.sm,
                vertical: AppDimensions.xs + AppDimensions.micro,
              ),
              constraints: const BoxConstraints(
                minHeight: AppDimensions.tapTargetMin,
              ),
              errorStyle: AppTypography.captionStyle.copyWith(
                color: AppColors.error,
              ),
              errorText: null,
            ),
          ),
        ),
        if (hasError) ...[
          const SizedBox(height: AppDimensions.xxs),
          Text(
            errorText!,
            style: AppTypography.captionStyle.copyWith(
              color: AppColors.error,
            ),
          ),
        ],
      ],
    );
  }
}

/// focus ring 包裹层：聚焦时外层 2px primaryFocus @ 50% outline。
///
/// 通过监听子输入框的 [FocusNode]（缺失时自建）切换外层 border，
/// 而非依赖 `Focus.of(context)` 冒泡——后者在 `canRequestFocus:false`
/// 时无法可靠感知子节点焦点，会导致 focus ring 不显示。
class _FocusRingField extends StatefulWidget {
  const _FocusRingField({
    required this.child,
    required this.enabled,
    required this.hasError,
    required this.focusNode,
  });

  final Widget child;
  final bool enabled;
  final bool hasError;
  final FocusNode? focusNode;

  @override
  State<_FocusRingField> createState() => _FocusRingFieldState();
}

class _FocusRingFieldState extends State<_FocusRingField> {
  FocusNode? _ownedFocusNode;
  bool _focused = false;

  FocusNode get _effective =>
      widget.focusNode ?? (_ownedFocusNode ??= FocusNode());

  @override
  void initState() {
    super.initState();
    _effective.addListener(_handleFocusChange);
    _focused = _effective.hasFocus;
  }

  @override
  void didUpdateWidget(covariant _FocusRingField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.focusNode != widget.focusNode) {
      oldWidget.focusNode ?? _ownedFocusNode?.removeListener(
        _handleFocusChange,
      );
      _ownedFocusNode?.dispose();
      _ownedFocusNode = null;
      _effective.addListener(_handleFocusChange);
      _focused = _effective.hasFocus;
    }
  }

  @override
  void dispose() {
    _effective.removeListener(_handleFocusChange);
    _ownedFocusNode?.dispose();
    super.dispose();
  }

  void _handleFocusChange() {
    if (!mounted) return;
    final next = _effective.hasFocus && widget.enabled;
    if (next != _focused) {
      setState(() => _focused = next);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: AppDimensions.animFast,
      curve: AppDimensions.easeOutQuart,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppDimensions.radiusMd + 2),
        border: _focused && !widget.hasError
            ? Border.all(
                color: AppColors.primaryFocus.withAlpha(128),
                width: 2,
              )
            : null,
      ),
      child: widget.child,
    );
  }
}
