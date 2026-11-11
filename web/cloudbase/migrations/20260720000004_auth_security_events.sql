-- 004_auth_security_events.sql
-- 安全审计事件与通知 Outbox

CREATE TABLE IF NOT EXISTS auth_security_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  principal_id uuid,
  event_type varchar(48) NOT NULL,
  risk_level varchar(10) NOT NULL,
  ip_prefix_hash char(64),
  device_hash char(64),
  user_agent_family varchar(80),
  request_id varchar(128),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT security_events_risk_level_check CHECK (risk_level IN ('info', 'low', 'medium', 'high', 'critical'))
);

CREATE INDEX IF NOT EXISTS idx_security_events_principal ON auth_security_events(principal_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON auth_security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON auth_security_events(created_at);

CREATE TABLE IF NOT EXISTS security_notification_outbox (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  principal_id uuid NOT NULL,
  event_id uuid NOT NULL,
  channel varchar(16) NOT NULL,
  template_code varchar(48) NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'pending',
  attempt_count smallint NOT NULL DEFAULT 0,
  next_attempt_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT outbox_event_channel_unique UNIQUE (event_id, channel),
  CONSTRAINT outbox_event_fk FOREIGN KEY (event_id) REFERENCES auth_security_events(id) ON DELETE CASCADE,
  CONSTRAINT outbox_principal_fk FOREIGN KEY (principal_id) REFERENCES principals(id) ON DELETE CASCADE,
  CONSTRAINT outbox_status_check CHECK (status IN ('pending', 'sent', 'failed', 'suppressed'))
);

CREATE INDEX IF NOT EXISTS idx_outbox_status_next ON security_notification_outbox(status, next_attempt_at);

-- 归档/清理策略：保留 90 天事件，Outbox 成功 30 天后可清理
-- 实际清理任务建议由定时触发器或外部运维脚本执行
