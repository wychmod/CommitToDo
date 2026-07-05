import 'package:flutter/material.dart';

import '../../../core/theme/app_theme_colors.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';
import '../../../core/utils/validators.dart';
import '../../../domain/entities/enums.dart';
import '../common/app_button.dart';
import '../common/app_date_picker_field.dart';
import '../common/app_input.dart';
import '../common/app_segmented_control.dart';

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
    final colors = AppThemeColors.of(context);
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
              color: colors.inkMuted,
            ),
          ),
          const SizedBox(height: AppDimensions.xs),
          AppSegmentedControl<Priority>(
            options: [
              for (final p in Priority.values)
                AppSegmentedOption(
                  value: p,
                  label: p.label,
                  leading: Container(
                    width: AppDimensions.dotSm,
                    height: AppDimensions.dotSm,
                    decoration: BoxDecoration(
                      color: _priorityColor(p),
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
            ],
            selected: _priority,
            onSelected: (value) => setState(() => _priority = value),
          ),
          const SizedBox(height: AppDimensions.md),

          // 截止日期选择
          AppDatePickerField(
            label: '截止日期（可选）',
            hint: '选择截止日期',
            value: _dueDate,
            onChanged: (date) => setState(() => _dueDate = date),
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
