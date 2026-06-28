import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/di/injection_container.dart';
import '../../domain/entities/branch.dart';
import '../../domain/repositories/i_branch_repository.dart';

/// 分支仓储 Provider
final branchRepoProvider = Provider<IBranchRepository>((ref) {
  return getIt<IBranchRepository>();
});

/// 分支详情 Provider
final branchDetailProvider =
    FutureProvider.family<Branch?, String>((ref, id) async {
  final repo = ref.read(branchRepoProvider);
  return await repo.getById(id);
});
