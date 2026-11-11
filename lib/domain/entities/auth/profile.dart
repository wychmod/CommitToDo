/// 用户档案与身份实体，对应 auth-gateway `/v1/auth/*` 返回结构。

class UserIdentity {
  const UserIdentity({
    required this.id,
    required this.provider,
    required this.providerSubject,
    this.identifierMasked,
    required this.isPrimary,
    required this.verifiedAt,
    this.lastUsedAt,
  });

  final String id;
  final String provider;
  final String providerSubject;
  final String? identifierMasked;
  final bool isPrimary;
  final DateTime verifiedAt;
  final DateTime? lastUsedAt;
}

class UserProfile {
  const UserProfile({
    required this.principalId,
    this.email,
    this.displayName,
    this.avatarUrl,
    required this.locale,
    required this.securityVersion,
    required this.identities,
  });

  final String principalId;
  final String? email;
  final String? displayName;
  final String? avatarUrl;
  final String locale;
  final int securityVersion;
  final List<UserIdentity> identities;

  UserProfile copyWith({
    String? displayName,
    List<UserIdentity>? identities,
  }) {
    return UserProfile(
      principalId: principalId,
      email: email,
      displayName: displayName ?? this.displayName,
      avatarUrl: avatarUrl,
      locale: locale,
      securityVersion: securityVersion,
      identities: identities ?? this.identities,
    );
  }
}

/// 请求验证码后的返回结果。
class ChallengeRequestResult {
  const ChallengeRequestResult({
    required this.challengeId,
    required this.purpose,
    required this.channel,
    required this.retryAfterSeconds,
    this.devCode,
  });

  final String challengeId;
  final String purpose;
  final String channel;
  final int retryAfterSeconds;
  final String? devCode;
}
