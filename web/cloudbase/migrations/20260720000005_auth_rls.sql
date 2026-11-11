-- 005_auth_rls.sql
-- 行级安全策略：浏览器只能读取自己的摘要数据

-- 启用 RLS
ALTER TABLE principals ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_security_events ENABLE ROW LEVEL SECURITY;

-- 浏览器 authenticated 角色通过 auth.uid() 映射到 principal_id
CREATE OR REPLACE FUNCTION current_principal_id()
RETURNS uuid AS $$
DECLARE
  v_uid text;
  v_principal_id uuid;
BEGIN
  v_uid := coalesce(current_setting('request.jwt.claims', true)::jsonb->>'sub', '');
  IF v_uid = '' THEN
    RETURN NULL;
  END IF;

  SELECT principal_id INTO v_principal_id
  FROM auth_subjects
  WHERE auth_uid = v_uid AND revoked_at IS NULL;

  RETURN v_principal_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- authenticated 只能读自己的 principal 摘要
DROP POLICY IF EXISTS principals_select_own ON principals;
CREATE POLICY principals_select_own ON principals
  FOR SELECT
  TO authenticated
  USING (id = current_principal_id());

-- authenticated 只能读自己的 identity 掩码
DROP POLICY IF EXISTS identities_select_own ON user_identities;
CREATE POLICY identities_select_own ON user_identities
  FOR SELECT
  TO authenticated
  USING (principal_id = current_principal_id());

DROP POLICY IF EXISTS subjects_select_own ON auth_subjects;
CREATE POLICY subjects_select_own ON auth_subjects
  FOR SELECT
  TO authenticated
  USING (principal_id = current_principal_id());

-- authenticated 只能读允许公开给自己的安全事件
DROP POLICY IF EXISTS events_select_own ON auth_security_events;
CREATE POLICY events_select_own ON auth_security_events
  FOR SELECT
  TO authenticated
  USING (principal_id = current_principal_id());

-- 浏览器不能修改身份和安全表（无 UPDATE/DELETE/INSERT policy）
-- service_role 绕过 RLS：授予其 BYPASSRLS 属性需在角色创建时由 CloudBase 管理员处理
-- 应用层使用 service_role 密钥连接时默认拥有完整表权限

-- 授予基础表权限给 authenticated（只读）
GRANT SELECT ON principals TO authenticated;
GRANT SELECT ON auth_subjects TO authenticated;
GRANT SELECT ON user_identities TO authenticated;
GRANT SELECT ON auth_security_events TO authenticated;

-- service_role 拥有全部权限
GRANT ALL ON principals TO service_role;
GRANT ALL ON auth_subjects TO service_role;
GRANT ALL ON user_identities TO service_role;
GRANT ALL ON verification_challenges TO service_role;
GRANT ALL ON auth_rate_limits TO service_role;
GRANT ALL ON account_merge_requests TO service_role;
GRANT ALL ON auth_security_events TO service_role;
GRANT ALL ON security_notification_outbox TO service_role;
