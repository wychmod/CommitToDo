/// 抽象认证令牌提供者。把"如何拿到 CloudBase JWT"与业务代码解耦，
/// 业务侧（repository / usecase）只依赖此接口，不感知具体 SDK。
abstract class IAuthTokenProvider {
  /// 使用用户名/密码登录，成功后内部缓存 JWT。
  Future<void> signIn({
    required String username,
    required String password,
  });

  /// 返回当前有效的访问令牌；未登录返回 null。
  Future<String?> getCurrentToken();

  /// 登出并清除缓存的令牌。
  Future<void> signOut();
}

/// 默认桩实现：未接入 CloudBase SDK 时使用，保证应用可编译运行。
/// 接入真实登录时替换为 [CloudbaseAuthTokenProvider]。
class StubAuthTokenProvider implements IAuthTokenProvider {
  @override
  Future<void> signIn({
    required String username,
    required String password,
  }) async {
    throw UnimplementedError(
      'Auth is not configured. Provide an IAuthTokenProvider implementation '
      '(e.g. CloudbaseAuthTokenProvider).',
    );
  }

  @override
  Future<String?> getCurrentToken() async => null;

  @override
  Future<void> signOut() async {}
}
