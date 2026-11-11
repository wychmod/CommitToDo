-- 002_auth_identities.sql
-- CloudBase uid 到应用主体的映射，以及用户可登录身份

CREATE TABLE IF NOT EXISTS auth_subjects (
  auth_uid varchar(128) PRIMARY KEY,
  principal_id uuid NOT NULL,
  is_canonical boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CONSTRAINT auth_subjects_principal_fk FOREIGN KEY (principal_id) REFERENCES principals(id) ON DELETE CASCADE,
  CONSTRAINT auth_subjects_single_canonical UNIQUE (principal_id, is_canonical)
);

CREATE INDEX IF NOT EXISTS idx_auth_subjects_principal ON auth_subjects(principal_id);

CREATE TABLE IF NOT EXISTS user_identities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  principal_id uuid NOT NULL,
  provider varchar(24) NOT NULL,
  provider_subject varchar(255) NOT NULL,
  identifier_hash char(64),
  identifier_masked varchar(128),
  is_primary boolean NOT NULL DEFAULT false,
  verified_at timestamptz NOT NULL,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_identities_principal_fk FOREIGN KEY (principal_id) REFERENCES principals(id) ON DELETE CASCADE,
  CONSTRAINT user_identities_provider_subject_unique UNIQUE (provider, provider_subject)
);

CREATE INDEX IF NOT EXISTS idx_user_identities_principal ON user_identities(principal_id);
CREATE INDEX IF NOT EXISTS idx_user_identities_provider ON user_identities(provider);

-- active phone identity 的条件唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_identities_active_phone_unique
  ON user_identities (identifier_hash)
  WHERE provider = 'phone' AND revoked_at IS NULL;

-- active email identity 也建议唯一（如业务允许同邮箱多账号请删除）
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_identities_active_email_unique
  ON user_identities (identifier_hash)
  WHERE provider = 'email' AND revoked_at IS NULL;

-- 同一 principal 仅一个 active canonical auth subject 的约束通过部分唯一索引实现
CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_subjects_canonical_unique
  ON auth_subjects (principal_id)
  WHERE is_canonical = true AND revoked_at IS NULL;
