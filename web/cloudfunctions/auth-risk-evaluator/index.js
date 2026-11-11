/**
 * Auth Risk Evaluator - Event Function
 *
 * Trigger: timer (every 5 minutes)
 * Responsibilities (implemented):
 *  - Evaluate SMS daily budget consumption vs AUTH_SMS_DAILY_BUDGET
 *  - Compute OTP send / verify failure rates over 5m and 10m windows
 *  - Detect top IP / device abuse (excessive challenge volume)
 *  - Emit structured logs and raise auth_security_events with risk levels
 *
 * NOTE: the auth_* tables live in PostgreSQL, NOT in the NoSQL database, so we
 * connect with `pg` directly (same pattern as auth-gateway). The connection
 * string is injected via PG_CONNECTION_STRING.
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

// ── Tunable thresholds (override via env) ────────────────────────────────
const SMS_DAILY_BUDGET = Number(process.env.AUTH_SMS_DAILY_BUDGET || 100);
const OTP_BLOCKED_10M_THRESHOLD = Number(process.env.AUTH_OTP_BLOCKED_10M || 20);
const OTP_BLOCKED_5M_THRESHOLD = Number(process.env.AUTH_OTP_BLOCKED_5M || 10);
const ABUSE_IP_5M_THRESHOLD = Number(process.env.AUTH_ABUSE_IP_5M || 30);
const ABUSE_DEVICE_5M_THRESHOLD = Number(process.env.AUTH_ABUSE_DEVICE_5M || 15);

async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

async function raiseEvent(principalId, eventType, riskLevel, metadata) {
  try {
    await query(
      `INSERT INTO auth_security_events
         (principal_id, event_type, risk_level, ip_prefix_hash, device_hash, request_id, metadata)
       VALUES ($1, $2, $3, NULL, NULL, $4, $5)`,
      [principalId, eventType, riskLevel, `risk-eval-${Date.now()}`, JSON.stringify(metadata || {})]
    );
  } catch (err) {
    console.error('[risk-evaluator] failed to write event:', err.message);
  }
}

async function evaluateSmsBudget() {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS sent_today
       FROM verification_challenges
      WHERE channel = 'sms'
        AND created_at >= date_trunc('day', now())`,
    []
  );
  const sentToday = rows[0] ? rows[0].sent_today : 0;
  const ratio = sentToday / SMS_DAILY_BUDGET;
  const riskLevel = ratio >= 0.95
    ? 'critical'
    : ratio >= 0.85 ? 'high' : ratio >= 0.7 ? 'medium' : 'info';
  if (riskLevel !== 'info') {
    await raiseEvent(
      null,
      'risk.sms_budget',
      riskLevel,
      { sentToday, budget: SMS_DAILY_BUDGET, ratio: Number(ratio.toFixed(2)) }
    );
  }
  return { sentToday, budget: SMS_DAILY_BUDGET, riskLevel };
}

async function evaluateOtpFailure() {
  const blocked10 = await query(
    `SELECT COUNT(*)::int AS c
       FROM verification_challenges
      WHERE status = 'blocked'
        AND updated_at >= now() - interval '10 minutes'`,
    []
  );
  const blocked5 = await query(
    `SELECT COUNT(*)::int AS c
       FROM verification_challenges
      WHERE status = 'blocked'
        AND updated_at >= now() - interval '5 minutes'`,
    []
  );
  const blocked10Count = blocked10.rows[0] ? blocked10.rows[0].c : 0;
  const blocked5Count = blocked5.rows[0] ? blocked5.rows[0].c : 0;

  if (blocked10Count >= OTP_BLOCKED_10M_THRESHOLD || blocked5Count >= OTP_BLOCKED_5M_THRESHOLD) {
    const level = blocked10Count >= OTP_BLOCKED_10M_THRESHOLD ? 'high' : 'medium';
    await raiseEvent(
      null,
      'risk.otp_failure_rate',
      level,
      { blocked5m: blocked5Count, blocked10m: blocked10Count }
    );
  }
  return { blocked5m: blocked5Count, blocked10m: blocked10Count };
}

async function evaluateAbuse() {
  const ipRows = await query(
    `SELECT ip_prefix_hash, COUNT(*)::int AS c
       FROM verification_challenges
      WHERE ip_prefix_hash IS NOT NULL
        AND created_at >= now() - interval '5 minutes'
      GROUP BY ip_prefix_hash
      ORDER BY c DESC
      LIMIT 10`,
    []
  );
  const deviceRows = await query(
    `SELECT device_hash, COUNT(*)::int AS c
       FROM verification_challenges
      WHERE device_hash IS NOT NULL
        AND created_at >= now() - interval '5 minutes'
      GROUP BY device_hash
      ORDER BY c DESC
      LIMIT 10`,
    []
  );

  const topIps = (ipRows.rows || []).filter((r) => r.c >= ABUSE_IP_5M_THRESHOLD);
  const topDevices = (deviceRows.rows || []).filter((r) => r.c >= ABUSE_DEVICE_5M_THRESHOLD);

  if (topIps.length || topDevices.length) {
    await raiseEvent(
      null,
      'risk.abuse_pattern',
      topIps.length > 3 || topDevices.length > 3 ? 'high' : 'medium',
      {
        topIpHashes: topIps.map((r) => ({ hash: r.ip_prefix_hash, count: r.c })),
        topDeviceHashes: topDevices.map((r) => ({ hash: r.device_hash, count: r.c })),
      }
    );
  }
  return { topIps: topIps.length, topDevices: topDevices.length };
}

exports.main = async (event, context) => {
  const requestId = context.request_id || `${Date.now()}`;
  if (!connectionString) {
    console.error(`[${requestId}] PG_CONNECTION_STRING not configured; skipping evaluation.`);
    return { ok: false, reason: 'pg_not_configured', requestId };
  }

  console.log(`[${requestId}] risk evaluator started`);
  const result = { ok: true, requestId, sms: null, otp: null, abuse: null };
  try {
    result.sms = await evaluateSmsBudget();
    result.otp = await evaluateOtpFailure();
    result.abuse = await evaluateAbuse();
    console.log(`[${requestId}] risk evaluation complete:`, JSON.stringify(result));
  } catch (err) {
    console.error(`[${requestId}] risk evaluation failed:`, err.message);
    result.ok = false;
    result.error = err.message;
  }
  return result;
};
