-- 003_auth_challenges_and_limits.sql
-- 验证码挑战、限流计数、账号合并请求

CREATE TABLE IF NOT EXISTS verification_challenges (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_verification_id varchar(255),
  purpose varchar(32) NOT NULL,
  channel varchar(10) NOT NULL,
  target_hash char(64),
  principal_id uuid,
  ip_prefix_hash char(64),
  device_hash char(64),
  status varchar(20) NOT NULL DEFAULT 'pending',
  attempt_count smallint NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  CONSTRAINT verification_challenges_status_check CHECK (status IN ('pending', 'verified', 'expired', 'blocked')),
  CONSTRAINT verification_challenges_purpose_check CHECK (purpose IN ('signup', 'signin', 'bind', 'recovery')),
  CONSTRAINT verification_challenges_channel_check CHECK (channel IN ('sms', 'email')),
  CONSTRAINT verification_challenges_principal_fk FOREIGN KEY (principal_id) REFERENCES principals(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_verification_challenges_target ON verification_challenges(target_hash);
CREATE INDEX IF NOT EXISTS idx_verification_challenges_ip_prefix ON verification_challenges(ip_prefix_hash);
CREATE INDEX IF NOT EXISTS idx_verification_challenges_device ON verification_challenges(device_hash);
CREATE INDEX IF NOT EXISTS idx_verification_challenges_status_expires ON verification_challenges(status, expires_at);

CREATE TABLE IF NOT EXISTS auth_rate_limits (
  scope_type varchar(20) NOT NULL,
  scope_key_hash char(64) NOT NULL,
  action varchar(32) NOT NULL,
  window_started_at timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope_type, scope_key_hash, action, window_started_at)
);

CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_block ON auth_rate_limits(blocked_until);

CREATE TABLE IF NOT EXISTS account_merge_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_principal_id uuid NOT NULL,
  target_principal_id uuid NOT NULL,
  source_proof_at timestamptz,
  target_proof_at timestamptz,
  status varchar(20) NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT merge_source_fk FOREIGN KEY (source_principal_id) REFERENCES principals(id) ON DELETE CASCADE,
  CONSTRAINT merge_target_fk FOREIGN KEY (target_principal_id) REFERENCES principals(id) ON DELETE CASCADE,
  CONSTRAINT merge_status_check CHECK (status IN ('pending', 'approved', 'completed', 'rejected', 'expired'))
);

CREATE INDEX IF NOT EXISTS idx_merge_requests_source ON account_merge_requests(source_principal_id);
CREATE INDEX IF NOT EXISTS idx_merge_requests_target ON account_merge_requests(target_principal_id);

-- 原子 consume quota 函数（由 service_role 调用）
CREATE OR REPLACE FUNCTION consume_rate_quota(
  p_scope_type varchar(20),
  p_scope_key_hash char(64),
  p_action varchar(32),
  p_window_seconds integer,
  p_increment integer DEFAULT 1
)
RETURNS TABLE(count integer, blocked_until timestamptz) AS $$
DECLARE
  v_window_start timestamptz;
BEGIN
  v_window_start := date_trunc('second', now()) - interval '1 second' * (extract(epoch from now())::integer % p_window_seconds);

  INSERT INTO auth_rate_limits (scope_type, scope_key_hash, action, window_started_at, count)
  VALUES (p_scope_type, p_scope_key_hash, p_action, v_window_start, p_increment)
  ON CONFLICT (scope_type, scope_key_hash, action, window_started_at)
  DO UPDATE SET
    count = auth_rate_limits.count + p_increment,
    updated_at = now()
  RETURNING auth_rate_limits.count, auth_rate_limits.blocked_until INTO count, blocked_until;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 过期 challenge 清理函数
CREATE OR REPLACE FUNCTION expire_old_challenges()
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE verification_challenges
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
