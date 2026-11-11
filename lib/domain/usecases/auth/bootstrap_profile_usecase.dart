import 'package:commit/domain/entities/auth/profile.dart';
import 'package:commit/domain/repositories/i_auth_repository.dart';

/// 登录后初始化用户档案，建立 principal + auth_subject 映射。
class BootstrapProfileUseCase {
  BootstrapProfileUseCase(this._repository);

  final IAuthRepository _repository;

  Future<UserProfile> execute({
    String? email,
    String? phone,
    String? displayName,
  }) {
    return _repository.bootstrapProfile(
      email: email,
      phone: phone,
      displayName: displayName,
    );
  }
}
