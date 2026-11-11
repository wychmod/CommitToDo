-- 007_auth_runtime_hardening.sql
-- Runtime fields required by the Auth Gateway implementation.

ALTER TABLE verification_challenges
  ADD COLUMN IF NOT EXISTS code_hash char(64),
  ADD COLUMN IF NOT EXISTS idempotency_key varchar(128),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_verification_challenges_idempotency
  ON verification_challenges (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION update_verification_challenges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_verification_challenges_updated_at ON verification_challenges;
CREATE TRIGGER trg_verification_challenges_updated_at
  BEFORE UPDATE ON verification_challenges
  FOR EACH ROW
  EXECUTE FUNCTION update_verification_challenges_updated_at();

GRANT ALL ON verification_challenges TO service_role;

ALTER TABLE security_notification_outbox
  ADD COLUMN IF NOT EXISTS processing_at timestamptz;

ALTER TABLE security_notification_outbox
  DROP CONSTRAINT IF EXISTS outbox_status_check;

ALTER TABLE security_notification_outbox
  ADD CONSTRAINT outbox_status_check
  CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'dead_letter', 'suppressed'));

CREATE INDEX IF NOT EXISTS idx_outbox_processing_lease
  ON security_notification_outbox(status, processing_at);

GRANT ALL ON security_notification_outbox TO service_role;
