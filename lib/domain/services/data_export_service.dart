import 'dart:convert';

import '../entities/branch.dart';
import '../entities/commit.dart' as entity;
import '../entities/repository.dart';
import '../entities/task.dart';
import '../repositories/i_branch_repository.dart';
import '../repositories/i_commit_repository.dart';
import '../repositories/i_repository_repository.dart';
import '../repositories/i_task_repository.dart';

/// 数据导出格式。
enum DataExportFormat {
  json,
  csv,
  markdown,
}

/// 本地数据导出服务。
class DataExportService {
  DataExportService(
    this._repositoryRepository,
    this._branchRepository,
    this._taskRepository,
    this._commitRepository,
  );

  final IRepositoryRepository _repositoryRepository;
  final IBranchRepository _branchRepository;
  final ITaskRepository _taskRepository;
  final ICommitRepository _commitRepository;

  Future<String> export(DataExportFormat format) async {
    final repositories = await _repositoryRepository.getAll();
    final branches = await _branchRepository.getAll();
    final tasks = await _taskRepository.getAll();

    final commits = <entity.Commit>[];
    for (final branch in branches) {
      commits.addAll(await _commitRepository.getByBranchId(branch.id));
    }

    return switch (format) {
      DataExportFormat.json => _exportJson(
          repositories: repositories,
          branches: branches,
          tasks: tasks,
          commits: commits,
        ),
      DataExportFormat.csv => _exportCsv(tasks),
      DataExportFormat.markdown => _exportMarkdown(
          repositories: repositories,
          branches: branches,
          tasks: tasks,
        ),
    };
  }

  String _exportJson({
    required List<Repository> repositories,
    required List<Branch> branches,
    required List<Task> tasks,
    required List<entity.Commit> commits,
  }) {
    return const JsonEncoder.withIndent('  ').convert({
      'version': 1,
      'exportedAt': DateTime.now().toIso8601String(),
      'repositories': repositories.map((item) => item.toJson()).toList(),
      'branches': branches.map((item) => item.toJson()).toList(),
      'tasks': tasks.map((item) => item.toJson()).toList(),
      'commits': commits.map((item) => item.toJson()).toList(),
    });
  }

  String _exportCsv(List<Task> tasks) {
    final rows = <List<String>>[
      [
        'id',
        'branchId',
        'title',
        'description',
        'status',
        'priority',
        'dueDate',
        'completedAt',
        'createdAt',
        'updatedAt',
      ],
      for (final task in tasks)
        [
          task.id,
          task.branchId,
          task.title,
          task.description ?? '',
          task.status.label,
          task.priority.label,
          task.dueDate?.toIso8601String() ?? '',
          task.completedAt?.toIso8601String() ?? '',
          task.createdAt.toIso8601String(),
          task.updatedAt.toIso8601String(),
        ],
    ];

    return rows.map((row) => row.map(_escapeCsv).join(',')).join('\n');
  }

  String _exportMarkdown({
    required List<Repository> repositories,
    required List<Branch> branches,
    required List<Task> tasks,
  }) {
    final buffer = StringBuffer()
      ..writeln('# Commit 数据导出')
      ..writeln()
      ..writeln('- 导出时间：${DateTime.now().toIso8601String()}')
      ..writeln('- 仓库数：${repositories.length}')
      ..writeln('- 分支数：${branches.length}')
      ..writeln('- 任务数：${tasks.length}')
      ..writeln();

    for (final repository in repositories) {
      buffer
        ..writeln('## ${repository.name}')
        ..writeln();

      final repoBranches = branches
          .where((branch) => branch.repositoryId == repository.id)
          .toList();
      for (final branch in repoBranches) {
        buffer
          ..writeln('### ${branch.name}')
          ..writeln();

        final branchTasks = tasks
            .where((task) => task.branchId == branch.id)
            .toList();
        if (branchTasks.isEmpty) {
          buffer..writeln('_暂无任务_')..writeln();
          continue;
        }

        for (final task in branchTasks) {
          final checked = task.isCompleted ? 'x' : ' ';
          buffer.writeln(
            '- [$checked] ${task.title} · ${task.status.label} · ${task.priority.label}',
          );
          if (task.description?.isNotEmpty ?? false) {
            buffer.writeln('  - ${task.description}');
          }
        }
        buffer.writeln();
      }
    }

    return buffer.toString();
  }

  String _escapeCsv(String value) {
    final needsQuotes = value.contains(',') ||
        value.contains('"') ||
        value.contains('\n') ||
        value.contains('\r');
    final escaped = value.replaceAll('"', '""');
    return needsQuotes ? '"$escaped"' : escaped;
  }
}
