import 'package:flutter/material.dart';

import '../../../core/theme/app_icons.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';
import '../../../core/utils/validators.dart';
import '../../../domain/entities/enums.dart';
import '../common/app_button.dart';
import '../common/app_input.dart';

/// 任务表单
class TaskForm extends StatefulWidget {
  const TaskForm({
    super.key,
    this.initialTitle,
    this.initialDescription,
    this.initialPriority,
    this.initialDueDate,
    this.onSubmit,
    this.isEditing = false,
  });

  final String? initialTitle;
  final String? initialDescription;
  final Priority? initialPriority;
  final DateTime? initialDueDate;
  final void Function({
    required String title,
    String? description,
    Priority priority,
    DateTime? dueDate,
  })? onSubmit;
  final bool isEditing;

  @override
  State<TaskForm> createState() => _TaskFormState();
}

class _TaskFormState extends State<TaskForm> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _titleController;
  late final TextEditingController _descController;
  Priority _priority = Priority.medium;
  DateTime? _dueDate;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(
      text: widget.initialTitle ?? '',
    );
    _descController = TextEditingController(
      text: widget.initialDescription ?? '',
    );
    _priority = widget.initialPriority ?? Priority.medium;
    _dueDate = widget.initialDueDate;
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    super.dispose();
  }

  Future<void> _selectDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _dueDate ?? DateTime.now(),
      firstDate: DateTime.now().subtract(
        const Duration(days: 365),
      ),
      lastDate: DateTime.now().add(
        const Duration(days: 365 * 2),
      ),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.dark(
              primary: AppColors.primary,
              onPrimary: AppColors.onPrimary,
              surface: AppColors.surface1,
              onSurface: AppColors.ink,
            ),
          ),
          child: child!,
        );
      },
    );
    if (date != null) {
      setState(() => _dueDate = date);
    }
  }

  void _submit() {
    if (_formKey.currentState?.validate() ?? false) {
      widget.onSubmit?.call(
        title: _titleController.text.trim(),
        description: _descController.text.trim().isEmpty
            ? null
            : _descController.text.trim(),
        priority: _priority,
        dueDate: _dueDate,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 标题输入
          AppInput(
            controller: _titleController,
            label: '任务标题',
            hint: '输入任务标题...',
            validator: Validators.validateTaskTitle,
            autofocus: true,
          ),
          const SizedBox(height: AppDimensions.md),

          // 描述输入
          AppInput(
            controller: _descController,
            label: '描述（可选）',
            hint: '输入任务描述...',
            maxLines: 4,
            validator: Validators.validateTaskDescription,
          ),
          const SizedBox(height: AppDimensions.md),

          // 优先级选择（segmented，DESIGN.md §7.2）
          Text(
            '优先级',
            style: AppTypography.eyebrowStyle.copyWith(
              color: AppColors.inkMuted,
            ),
          ),
          const SizedBox(height: AppDimensions.xs),
          Row(
            children: [
              for (final p in Priority.values) ...[
                Semantics(
                  button: true,
                  selected: _priority == p,
                  label: '${p.label}优先级',
                  child: InkWell(
                    onTap: () => setState(() => _priority = p),
                    borderRadius: BorderRadius.circular(
                      AppDimensions.radiusPill,
                    ),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppDimensions.sm + 2,
                        vertical: AppDimensions.xs - AppDimensions.micro,
                      ),
                      margin: const EdgeInsets.only(
                        right: AppDimensions.xs,
                      ),
                      decoration: BoxDecoration(
                        color: _priority == p
                            ? AppColors.surface2
                            : AppColors.canvas,
                        borderRadius: BorderRadius.circular(
                          AppDimensions.radiusPill,
                        ),
                        border: Border.all(
                          color: _priority == p
                              ? _priorityColor(p)
                              : AppColors.hairline,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: AppDimensions.dotSm,
                            height: AppDimensions.dotSm,
                            decoration: BoxDecoration(
                              color: _priorityColor(p),
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: AppDimensions.xxs),
                          Text(
                            p.label,
                            style: AppTypography.monoSmStyle.copyWith(
                              color: _priority == p
                                  ? AppColors.ink
                                  : AppColors.inkSubtle,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: AppDimensions.md),

          // 截止日期选择
          Text(
            '截止日期（可选）',
            style: AppTypography.eyebrowStyle.copyWith(
              color: AppColors.inkMuted,
            ),
          ),
          const SizedBox(height: AppDimensions.xs),
          Semantics(
            button: true,
            label: _dueDate != null
                ? '截止日期 ${_dueDate!.year}-${_dueDate!.month.toString().padLeft(2, '0')}-${_dueDate!.day.toString().padLeft(2, '0')}'
                : '选择截止日期',
            child: InkWell(
              onTap: _selectDate,
              borderRadius: BorderRadius.circular(
                AppDimensions.radiusMd,
              ),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppDimensions.sm,
                  vertical: AppDimensions.sm + AppDimensions.micro,
                ),
                decoration: BoxDecoration(
                  color: AppColors.surface1,
                  borderRadius: BorderRadius.circular(
                    AppDimensions.radiusMd,
                  ),
                  border: Border.all(color: AppColors.hairlineStrong),
                ),
                child: Row(
                  children: [
                    const AppIcon(
                      AppIcons.calendar,
                      size: AppDimensions.iconSm,
                      color: AppColors.inkSubtle,
                    ),
                    const SizedBox(width: AppDimensions.xs),
                    Text(
                      _dueDate != null
                          ? '${_dueDate!.year}-${_dueDate!.month.toString().padLeft(2, '0')}-${_dueDate!.day.toString().padLeft(2, '0')}'
                          : '选择截止日期',
                      style: AppTypography.bodyStyle.copyWith(
                        color: _dueDate != null
                            ? AppColors.ink
                            : AppColors.inkSubtle,
                      ),
                    ),
                    const Spacer(),
                    if (_dueDate != null)
                      Semantics(
                        button: true,
                        label: '清除截止日期',
                        child: InkWell(
                          onTap: () => setState(() => _dueDate = null),
                          borderRadius: BorderRadius.circular(
                            AppDimensions.radiusFull,
                          ),
                          child: const Padding(
                            padding: EdgeInsets.all(AppDimensions.xxs),
                            child: AppIcon(
                              AppIcons.close,
                              size: AppDimensions.iconSm,
                              color: AppColors.inkSubtle,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: AppDimensions.xl),

          // 提交按钮
          AppButton(
            text: widget.isEditing ? '保存修改' : '创建任务',
            onPressed: _submit,
            isExpanded: true,
          ),
        ],
      ),
    );
  }

  Color _priorityColor(Priority p) {
    return switch (p) {
      Priority.high => AppColors.priorityHigh,
      Priority.medium => AppColors.priorityMedium,
      Priority.low => AppColors.priorityLow,
    };
  }
}
