import 'package:commit/domain/entities/auth/profile.dart';
import 'package:commit/domain/repositories/i_auth_repository.dart';

/// 请求发送验证码（注册/登录/绑定/找回）。
class RequestChallengeUseCase {
  RequestChallengeUseCase(this._repository);

  final IAuthRepository _repository;

  Future<ChallengeRequestResult> execute({
    required String purpose,
    required String channel,
    required String target,
    String? device,
  }) {
    return _repository.requestChallenge(
      purpose: purpose,
      channel: channel,
      target: target,
      device: device,
    );
  }
}
