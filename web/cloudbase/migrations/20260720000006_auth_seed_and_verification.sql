-- 006_auth_seed_and_verification.sql
-- 不创建默认 admin 用户；只插入枚举配置、系统版本，并执行自检

CREATE TABLE IF NOT EXISTS auth_schema_version (
  id integer PRIMARY KEY DEFAULT 1,
  version integer NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  verification_note text
);

INSERT INTO auth_schema_version (id, version, verification_note)
VALUES (1, 6, 'Initial auth schema migration applied')
ON CONFLICT (id) DO UPDATE SET
  version = EXCLUDED.version,
  applied_at = now(),
  verification_note = EXCLUDED.verification_note;

-- 自检：确保核心约束存在
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'principals_status_check' AND conrelid = 'principals'::regclass
  ) THEN
    RAISE EXCEPTION 'principals_status_check missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_user_identities_active_phone_unique'
  ) THEN
    RAISE EXCEPTION 'active phone unique index missing';
  END IF;
END;
$$;

-- 跨用户拒绝验证将在应用层集成测试中用测试用户 A/B 执行
