import 'package:commit/domain/entities/auth/profile.dart';
import 'package:commit/domain/repositories/i_auth_repository.dart';

/// 获取当前登录用户的档案。
class GetProfileUseCase {
  GetProfileUseCase(this._repository);

  final IAuthRepository _repository;

  Future<UserProfile> execute() {
    return _repository.getProfile();
  }
}
