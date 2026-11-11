import 'package:commit/domain/repositories/i_auth_repository.dart';

/// 校验验证码是否正确。
class VerifyChallengeUseCase {
  VerifyChallengeUseCase(this._repository);

  final IAuthRepository _repository;

  Future<bool> execute({
    required String challengeId,
    required String code,
  }) {
    return _repository.verifyChallenge(
      challengeId: challengeId,
      code: code,
    );
  }
}
