import 'package:commit/domain/entities/auth/profile.dart';

/// 认证仓储接口。Presentation 层只依赖此接口，不关心底层是
/// auth-gateway REST 还是其它实现。
abstract class IAuthRepository {
  /// 请求发送验证码（公开端点，无需登录）。
  Future<ChallengeRequestResult> requestChallenge({
    required String purpose,
    required String channel,
    required String target,
    String? device,
  });

  /// 校验验证码（公开端点）。
  Future<bool> verifyChallenge({
    required String challengeId,
    required String code,
  });

  /// 登录后初始化档案，建立 principal + auth_subject 映射（需 Bearer JWT）。
  Future<UserProfile> bootstrapProfile({
    String? email,
    String? phone,
    String? displayName,
  });

  /// 获取当前登录用户的档案（需 Bearer JWT）。
  Future<UserProfile> getProfile();
}
