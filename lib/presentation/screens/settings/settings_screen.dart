import 'dart:convert';
import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/di/injection_container.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';
import '../../../domain/services/data_export_service.dart';
import '../../providers/settings_providers.dart';
import '../../widgets/common/app_bar_widget.dart';
import '../../widgets/common/app_dialog.dart';
import '../../widgets/common/app_button.dart';
import '../../widgets/common/app_toast.dart';

/// 设置页
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(settingsProvider);

    return Scaffold(
      appBar: const AppBarWidget(title: '设置'),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppDimensions.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 展示面头部
            ShaderMask(
              shaderCallback: (bounds) => const LinearGradient(
                colors: AppColors.primaryGradient,
              ).createShader(bounds),
              child: Text(
                '偏好',
                style: AppTypography.displayMdStyle.copyWith(
                  color: AppColors.onPrimary,
                ),
              ),
            ),
            const SizedBox(height: AppDimensions.xl),

            // 外观设置
            _buildSectionTitle('外观'),
            const SizedBox(height: AppDimensions.xs),
            _buildSettingsGroup([
              _SettingsItem(
                icon: AppIcons.darkMode,
                title: '深色模式',
                trailing: Switch(
                  value: settings.isDarkMode,
                  onChanged: (value) => ref
                      .read(settingsProvider.notifier)
                      .setDarkMode(value),
                  activeColor: AppColors.primary,
                ),
              ),
            ]),
            const SizedBox(height: AppDimensions.xl),

            // 数据设置
            _buildSectionTitle('数据'),
            const SizedBox(height: AppDimensions.xs),
            _buildSettingsGroup([
              _SettingsItem(
                icon: AppIcons.upload,
                title: '导出数据',
                onTap: () => _showExportSheet(context),
              ),
              _SettingsItem(
                icon: AppIcons.download,
                title: '导入数据',
                onTap: () => _showComingSoon(
                  context,
                  title: '导入数据',
                  message: '导入会支持 JSON 备份文件，'
                      '并在写入前做结构校验与重复数据确认。',
                ),
              ),
              _SettingsItem(
                icon: AppIcons.deleteSweep,
                title: '清除已删除项目',
                onTap: () => _showComingSoon(
                  context,
                  title: '清除已删除项目',
                  message: '清理入口会在数据层补齐永久删除用例后启用，'
                      '避免绕过仓库与分支的级联规则。',
                ),
              ),
            ]),
            const SizedBox(height: AppDimensions.xl),

            // 通知设置
            _buildSectionTitle('通知'),
            const SizedBox(height: AppDimensions.xs),
            _buildSettingsGroup([
              _SettingsItem(
                icon: AppIcons.notifications,
                title: '任务提醒',
                trailing: Switch(
                  value: settings.enableNotifications,
                  onChanged: (value) => ref
                      .read(settingsProvider.notifier)
                      .setNotifications(value),
                  activeColor: AppColors.primary,
                ),
              ),
              _SettingsItem(
                icon: AppIcons.timer,
                title: '提前提醒时间',
                trailing: Text(
                  '${settings.reminderHours} 小时',
                  style: AppTypography.monoSmStyle.copyWith(
                    color: AppColors.inkMuted,
                  ),
                ),
                onTap: () {
                  _showReminderTimePicker(context, ref);
                },
              ),
            ]),
            const SizedBox(height: AppDimensions.xl),

            // 关于
            _buildSectionTitle('关于'),
            const SizedBox(height: AppDimensions.xs),
            _buildSettingsGroup([
              _SettingsItem(
                icon: AppIcons.info,
                title: '版本',
                trailing: Text(
                  'v1.0.0',
                  style: AppTypography.monoSmStyle.copyWith(
                    color: AppColors.inkMuted,
                  ),
                ),
              ),
              _SettingsItem(
                icon: AppIcons.description,
                title: '开源协议',
                onTap: () => _showInfoDialog(
                  context,
                  title: '开源协议',
                  message: 'Commit 目前以内部项目方式维护。'
                      '正式发布时会在这里展示完整的许可证文本。',
                ),
              ),
              _SettingsItem(
                icon: AppIcons.feedback,
                title: '反馈建议',
                onTap: () => _showInfoDialog(
                  context,
                  title: '反馈建议',
                  message: '可以先通过项目仓库或团队沟通渠道反馈问题。'
                      '后续版本会接入专用反馈入口。',
                ),
              ),
            ]),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: AppTypography.eyebrowStyle.copyWith(
        color: AppColors.inkSubtle,
      ),
    );
  }

  Widget _buildSettingsGroup(List<Widget> items) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface1,
        borderRadius: BorderRadius.circular(AppDimensions.radiusLg),
        border: Border.all(color: AppColors.hairline),
      ),
      child: Column(
        children: [
          for (var i = 0; i < items.length; i++) ...[
            items[i],
            if (i < items.length - 1)
              const Divider(
                color: AppColors.hairline,
                height: 1,
                thickness: 1,
              ),
          ],
        ],
      ),
    );
  }

  void _showExportSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface1,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AppDimensions.radiusXl),
        ),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _ExportTile(
              label: '导出 JSON',
              format: DataExportFormat.json,
              onPreview: (content) => _showExportPreview(
                context,
                'JSON 导出预览',
                content,
              ),
            ),
            _ExportTile(
              label: '导出 CSV',
              format: DataExportFormat.csv,
              onPreview: (content) => _showExportPreview(
                context,
                'CSV 导出预览',
                content,
              ),
            ),
            _ExportTile(
              label: '导出 Markdown',
              format: DataExportFormat.markdown,
              onPreview: (content) => _showExportPreview(
                context,
                'Markdown 导出预览',
                content,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showExportPreview(
    BuildContext context,
    String title,
    String content,
  ) {
    AppDialog.show<void>(
      context,
      title: title,
      content: ConstrainedBox(
        constraints: const BoxConstraints(maxHeight: 320),
        child: SingleChildScrollView(
          child: SelectableText(
            content,
            style: AppTypography.monoSmStyle.copyWith(
              color: AppColors.inkMuted,
            ),
          ),
        ),
      ),
      actions: [
        DialogAction(
          text: '关闭',
          variant: ButtonVariant.secondary,
        ),
      ],
    );
  }

  void _showInfoDialog(
    BuildContext context, {
    required String title,
    required String message,
  }) {
    AppDialog.show<void>(
      context,
      title: title,
      content: Text(message),
      actions: [
        DialogAction(
          text: '知道了',
          variant: ButtonVariant.secondary,
        ),
      ],
    );
  }

  void _showComingSoon(
    BuildContext context, {
    required String title,
    required String message,
  }) {
    _showInfoDialog(
      context,
      title: title,
      message: message,
    );
    AppToast.show(
      context,
      message: '$title 将在后续版本启用',
      variant: ToastVariant.info,
    );
  }

  void _showReminderTimePicker(
    BuildContext context,
    WidgetRef ref,
  ) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface1,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AppDimensions.radiusXl),
        ),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final hours in [1, 2, 4, 8, 24])
              ListTile(
                title: Text(
                  '$hours 小时',
                  style: AppTypography.bodyStyle.copyWith(
                    color: AppColors.ink,
                  ),
                ),
                onTap: () {
                  ref
                      .read(settingsProvider.notifier)
                      .setReminderHours(hours);
                  Navigator.pop(ctx);
                },
              ),
          ],
        ),
      ),
    );
  }
}
class _ExportTile extends StatelessWidget {
  const _ExportTile({
    required this.label,
    required this.format,
    required this.onPreview,
  });

  final String label;
  final DataExportFormat format;
  final ValueChanged<String> onPreview;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: const AppIcon(
        AppIcons.upload,
        color: AppColors.primary,
      ),
      title: Text(
        label,
        style: AppTypography.bodyStyle.copyWith(color: AppColors.ink),
      ),
      onTap: () async {
        Navigator.pop(context);
        try {
          final content = await getIt<DataExportService>().export(format);
          final path = await FilePicker.platform.saveFile(
            dialogTitle: '保存 $label',
            fileName: _defaultFileName(format),
            type: FileType.custom,
            allowedExtensions: [_extension(format)],
            bytes: Uint8List.fromList(utf8.encode(content)),
          );
          if (!context.mounted) return;

          if (path == null) {
            onPreview(content);
            AppToast.show(
              context,
              message: '已取消保存，导出内容可在预览中复制',
              variant: ToastVariant.info,
            );
            return;
          }

          AppToast.show(
            context,
            message: '已导出到 $path',
            variant: ToastVariant.success,
          );
        } on Object catch (error) {
          if (!context.mounted) return;
          AppToast.show(
            context,
            message: '导出失败：$error',
            variant: ToastVariant.error,
          );
        }
      },
    );
  }

  String _defaultFileName(DataExportFormat format) {
    final timestamp = DateTime.now()
        .toIso8601String()
        .replaceAll(':', '-')
        .split('.')
        .first;
    return 'commit-export-$timestamp.${_extension(format)}';
  }

  String _extension(DataExportFormat format) {
    return switch (format) {
      DataExportFormat.json => 'json',
      DataExportFormat.csv => 'csv',
      DataExportFormat.markdown => 'md',
    };
  }
}
/// 设置项
class _SettingsItem extends StatelessWidget {
  const _SettingsItem({
    required this.icon,
    required this.title,
    this.trailing,
    this.onTap,
  });

  final AppIconName icon;
  final String title;
  final Widget? trailing;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: onTap != null,
      label: title,
      child: InkWell(
        onTap: onTap,
        child: Container(
          height: AppDimensions.navItemHeight + AppDimensions.xs,
          padding: const EdgeInsets.symmetric(
            horizontal: AppDimensions.md,
          ),
          child: Row(
            children: [
              AppIcon(
                icon,
                size: AppDimensions.iconMd,
                color: AppColors.inkMuted,
              ),
              const SizedBox(width: AppDimensions.md),
              Expanded(
                child: Text(
                  title,
                  style: AppTypography.bodyStyle.copyWith(
                    color: AppColors.ink,
                  ),
                ),
              ),
              if (trailing != null) trailing!,
              if (onTap != null && trailing == null)
                const AppIcon(
                  AppIcons.chevronRight,
                  size: AppDimensions.iconMd,
                  color: AppColors.inkSubtle,
                ),
            ],
          ),
        ),
      ),
    );
  }
}
