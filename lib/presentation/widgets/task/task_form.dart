import 'package:flutter/material.dart';

import '../../../core/theme/app_icons.dart';
import '../../../core/theme/colors.dart';
import '../../../core/theme/dimensions.dart';
import '../../../core/theme/typography.dart';
import '../../../core/utils/validators.dart';
import '../../../domain/entities/enums.dart';
import '../common/app_badge.dart';
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
              surface: AppColors.bgElevated,
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
          const SizedBox(height: AppDimensions.base),

          // 描述输入
          AppInput(
            controller: _descController,
            label: '描述（可选）',
            hint: '输入任务描述...',
            maxLines: 4,
            validator: Validators.validateTaskDescription,
          ),
          const SizedBox(height: AppDimensions.base),

          // 优先级选择
          const Text(
            '优先级',
            style: TextStyle(
              fontFamily: AppTypography.bodyFont,
              fontSize: AppTypography.sm,
              fontWeight: AppTypography.medium,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: AppDimensions.sm),
          Row(
            children: [
              for (final p in Priority.values) ...[
                Semantics(
                  button: true,
                  selected: _priority == p,
                  label: '${p.label}优先级',
                  child: InkWell(
                    onTap: () =>
                        setState(() => _priority = p),
                    borderRadius: BorderRadius.circular(
                      AppDimensions.radiusMd,
                    ),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppDimensions.md,
                        vertical: AppDimensions.sm,
                      ),
                      margin: const EdgeInsets.only(
                        right: AppDimensions.sm,
                      ),
                      decoration: BoxDecoration(
                        color: _priority == p
                            ? _priorityColor(p).withAlpha(26)
                            : AppColors.bgElevated,
                        borderRadius: BorderRadius.circular(
                          AppDimensions.radiusMd,
                        ),
                        border: Border.all(
                          color: _priority == p
                              ? _priorityColor(p)
                              : AppColors.borderDefault,
                        ),
                      ),
                      child: Text(
                        p.label,
                        style: TextStyle(
                          color: _priority == p
                              ? _priorityColor(p)
                              : AppColors.textSecondary,
                          fontWeight: _priority == p
                              ? AppTypography.medium
                              : AppTypography.regular,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: AppDimensions.base),

          // 截止日期选择
          const Text(
            '截止日期（可选）',
            style: TextStyle(
              fontFamily: AppTypography.bodyFont,
              fontSize: AppTypography.sm,
              fontWeight: AppTypography.medium,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: AppDimensions.sm),
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
                  horizontal: AppDimensions.base,
                  vertical: AppDimensions.md,
                ),
                decoration: BoxDecoration(
                  color: AppColors.bgSurface,
                  borderRadius: BorderRadius.circular(
                    AppDimensions.radiusMd,
                  ),
                  border: Border.all(
                    color: AppColors.borderDefault,
                  ),
                ),
                child: Row(
                  children: [
                    const AppIcon(
                      AppIcons.calendar,
                      size: 16,
                      color: AppColors.textTertiary,
                    ),
                    const SizedBox(width: AppDimensions.sm),
                    Text(
                      _dueDate != null
                          ? '${_dueDate!.year}-${_dueDate!.month.toString().padLeft(2, '0')}-${_dueDate!.day.toString().padLeft(2, '0')}'
                          : '选择截止日期',
                      style: TextStyle(
                        color: _dueDate != null
                            ? AppColors.textPrimary
                            : AppColors.textTertiary,
                      ),
                    ),
                    const Spacer(),
                    if (_dueDate != null)
                      Semantics(
                        button: true,
                        label: '清除截止日期',
                        child: InkWell(
                          onTap: () => setState(
                            () => _dueDate = null,
                          ),
                          borderRadius: BorderRadius.circular(
                            AppDimensions.radiusFull,
                          ),
                          child: const Padding(
                            padding: EdgeInsets.all(4),
                            child: AppIcon(
                              AppIcons.close,
                              size: 16,
                              color: AppColors.textTertiary,
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
