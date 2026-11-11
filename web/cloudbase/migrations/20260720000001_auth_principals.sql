-- 001_auth_principals.sql
-- Commit 应用层用户主体表

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS principals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  status varchar(20) NOT NULL DEFAULT 'active',
  display_name varchar(80),
  avatar_url text,
  locale varchar(16) NOT NULL DEFAULT 'zh-CN',
  security_version bigint NOT NULL DEFAULT 1,
  merged_into_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT principals_status_check CHECK (status IN ('active', 'locked', 'merged', 'deleted')),
  CONSTRAINT principals_merged_into_fk FOREIGN KEY (merged_into_id) REFERENCES principals(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_principals_status ON principals(status);
CREATE INDEX IF NOT EXISTS idx_principals_merged_into ON principals(merged_into_id);

-- updated_at 自动维护
CREATE OR REPLACE FUNCTION update_principals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_principals_updated_at ON principals;
CREATE TRIGGER trg_principals_updated_at
  BEFORE UPDATE ON principals
  FOR EACH ROW
  EXECUTE FUNCTION update_principals_updated_at();

-- 不授予 anon 访问；service_role 和 authenticated 的权限在 005 中配置
