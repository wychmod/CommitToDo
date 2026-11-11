/**
 * Security Notification Worker - Event Function
 *
 * Trigger: timer (every minute)
 * Responsibilities:
 * - Poll pending/failed security_notification_outbox rows
 * - Send via email / in-app channel
 * - Update attempt_count, next_attempt_at, status
 * - Suppress if principal has disabled channel
 */

const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({ env: process.env.TCB_ENV_ID || '' });
const db = app.database();

exports.main = async (event, context) => {
  const requestId = context.request_id || `${Date.now()}`;
  console.log(`[${requestId}] notification worker started`);

  // TODO: implement polling and delivery
  // 1. Query outbox where status='pending' OR (status='failed' AND next_attempt_at <= now())
  // 2. Group by principal/channel, skip if suppressed
  // 3. Render template with masked metadata
  // 4. Send email via CloudBase/自定义 SMTP / in-app notification
  // 5. Update status, sent_at, attempt_count

  return { ok: true, processed: 0, requestId };
};
