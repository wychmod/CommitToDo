/**
 * Security Notification Worker - Event Function
 *
 * Trigger: timer (every minute)
 * Responsibilities (implemented):
 *  - Poll security_notification_outbox for pending / retry-due rows
 *  - Group by principal + channel, skip suppressed rows
 *  - Render a minimal template from the linked auth_security_events metadata
 *  - Deliver via email (nodemailer when SMTP_* env is set) or in-app (no-op marker)
 *  - Update attempt_count, next_attempt_at, status
 *
 * NOTE: the auth_* tables live in PostgreSQL, so we connect with `pg` directly
 * (same pattern as auth-gateway). PG_CONNECTION_STRING injects the connection.
 */

const { Pool } = require('pg');

const connectionString =
  process.env.PG_CONNECTION_STRING ||
  process.env.AUTH_PG_CONNECTION_STRING ||
  process.env.DATABASE_URL ||
  '';

const pool = new Pool({
  connectionString,
  max: 2,
  ssl: process.env.PG_NO_SSL === '1' ? false : { rejectUnauthorized: false },
});

const MAX_ATTEMPTS = Number(process.env.AUTH_NOTIFY_MAX_ATTEMPTS || 5);
const RETRY_BACKOFF_MINUTES = Number(process.env.AUTH_NOTIFY_BACKOFF || 5);

async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

function renderBody(templateCode, metadata) {
  const m = metadata || {};
  switch (templateCode) {
    case 'login.new_device':
      return `检测到新设备登录（风险等级：${m.riskLevel || 'unknown'}）。如非本人操作请尽快修改密码。`;
    case 'identity.bind.phone':
      return `您的账号已绑定新手机号（${m.phone || ''}）。`;
    case 'account.merge.requested':
      return `收到账号合并请求，请在新设备上确认以完成合并。`;
    default:
      return `您有一条新的安全通知（${templateCode || 'security'}）。`;
  }
}

async function sendEmail(recipientMasked, templateCode, metadata) {
  const host = process.env.SMTP_HOST;
  if (!host || !process.env.SMTP_FROM) {
    // No SMTP configured yet — degrade gracefully to a log line so the outbox
    // is not stuck in a retry loop. Mark as failed for operator visibility.
    console.log(
      `[notify] (email) SMTP not configured; would send template=${templateCode} to=${recipientMasked}`
    );
    return { delivered: false, reason: 'smtp_not_configured' };
  }
  if (!recipientMasked || recipientMasked.includes('*')) {
    return { delivered: false, reason: 'recipient_address_unavailable' };
  }

  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch (e) {
    console.error('[notify] nodemailer is not installed:', e.message);
    return { delivered: false, reason: 'nodemailer_missing' };
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 465),
    secure: (process.env.SMTP_SECURE || 'true') === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: recipientMasked,
    subject: `[Commit 安全通知] ${templateCode}`,
    text: renderBody(templateCode, metadata),
  });
  return { delivered: true };
}

async function deliver(row) {
  // For now only 'email' channel is wired. 'in_app' is considered delivered
  // immediately (the client reads it from the profile / events feed).
  if (row.channel === 'email') {
    const recipient = await lookupRecipient(row.principal_id);
    if (!recipient) {
      return { delivered: false, reason: 'no_recipient' };
    }
    return sendEmail(recipient, row.template_code, row.metadata || {});
  }
  if (row.channel === 'in_app') {
    return { delivered: true };
  }
  return { delivered: false, reason: `unsupported_channel:${row.channel}` };
}

async function lookupRecipient(principalId) {
  try {
    const { rows } = await query(
      `SELECT identifier_masked
         FROM user_identities
        WHERE principal_id = $1 AND provider = 'email' AND revoked_at IS NULL
        ORDER BY is_primary DESC, created_at ASC
        LIMIT 1`,
      [principalId]
    );
    return rows[0] ? rows[0].identifier_masked : null;
  } catch (err) {
    console.error('[notify] recipient lookup failed:', err.message);
    return null;
  }
}

async function processBatch() {
  const { rows } = await query(
    `WITH candidates AS (
       SELECT id
         FROM security_notification_outbox
        WHERE status = 'pending'
           OR (status = 'failed' AND next_attempt_at <= now())
           OR (status = 'processing' AND processing_at < now() - interval '10 minutes')
        ORDER BY created_at ASC
        LIMIT 100
        FOR UPDATE SKIP LOCKED
     ), claimed AS (
       UPDATE security_notification_outbox o
          SET status = 'processing', processing_at = now()
         FROM candidates c
        WHERE o.id = c.id
        RETURNING o.*
     )
     SELECT c.id, c.principal_id, c.event_id, c.channel, c.template_code,
            c.attempt_count, e.metadata
       FROM claimed c
       LEFT JOIN auth_security_events e ON e.id = c.event_id`,
    []
  );

  let processed = 0;
  let delivered = 0;
  for (const row of rows) {
    processed += 1;
    const attempt = (row.attempt_count || 0) + 1;
    const outcome = await deliver(row);

    if (outcome.delivered) {
      await query(
        `UPDATE security_notification_outbox
            SET status = 'sent', attempt_count = $2, sent_at = now(), processing_at = NULL
          WHERE id = $1`,
        [row.id, attempt]
      );
      delivered += 1;
    } else if (attempt >= MAX_ATTEMPTS) {
      await query(
        `UPDATE security_notification_outbox
            SET status = 'dead_letter', attempt_count = $2, processing_at = NULL
          WHERE id = $1`,
        [row.id, attempt]
      );
    } else {
      await query(
        `UPDATE security_notification_outbox
            SET status = 'failed', attempt_count = $2, processing_at = NULL,
                next_attempt_at = now() + ($3 || '5')::int * interval '1 minute'
          WHERE id = $1`,
        [row.id, attempt, String(RETRY_BACKOFF_MINUTES)]
      );
    }
  }
  return { processed, delivered };
}

exports.main = async (event, context) => {
  const requestId = context.request_id || `${Date.now()}`;
  if (!connectionString) {
    console.error(`[${requestId}] PG_CONNECTION_STRING not configured; skipping delivery.`);
    return { ok: false, reason: 'pg_not_configured', requestId };
  }

  console.log(`[${requestId}] notification worker started`);
  try {
    const result = await processBatch();
    console.log(`[${requestId}] notification worker done:`, JSON.stringify(result));
    return { ok: true, requestId, ...result };
  } catch (err) {
    console.error(`[${requestId}] notification worker failed:`, err.message);
    return { ok: false, requestId, error: err.message };
  }
};
