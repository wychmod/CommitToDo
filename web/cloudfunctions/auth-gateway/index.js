/**
 * Auth Gateway - HTTP Cloud Function (real implementation)
 *
 * Responsibilities:
 * - Public: request/verify verification challenges with rate-limit + risk checks
 * - Session: bootstrap application profile, read own profile, bind phone identity,
 *   list security events, create account-merge requests
 *
 * It does NOT issue CloudBase login tokens. Login is handled by the Web SDK.
 */

const http = require('http');
const { URL } = require('url');
const db = require('./db');

const CORS_ALLOWED_ORIGINS = (process.env.AUTH_ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const ENV_ID = process.env.TCB_ENV_ID || process.env.CLOUDBASE_ENV_ID || '';
const AUTH_API_BASE_URL = (process.env.AUTH_CLOUDBASE_AUTH_API_BASE_URL || '').replace(/\/$/, '');

const CHALLENGE_TTL_SECONDS = 600; // 10 minutes
const CHALLENGE_MAX_ATTEMPTS = 5;
const SMS_DAILY_BUDGET = Number(process.env.AUTH_SMS_DAILY_BUDGET || 100);
const MAX_BODY_BYTES = 32 * 1024;
const CAPTCHA_VERIFY_URL = process.env.AUTH_CAPTCHA_VERIFY_URL || '';
const CAPTCHA_VERIFY_TOKEN = process.env.AUTH_CAPTCHA_VERIFY_TOKEN || '';

function getRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function corsHeaders(origin) {
  const allowed = CORS_ALLOWED_ORIGINS.includes('*')
    ? '*'
    : CORS_ALLOWED_ORIGINS.includes(origin) ? origin : null;
  return {
    ...(allowed ? { 'Access-Control-Allow-Origin': allowed } : {}),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, Idempotency-Key, X-Device-Id, X-Request-Id',
    'Access-Control-Max-Age': '86400',
  };
}

function sendJson(res, statusCode, data, headers) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    ...headers,
  });
  res.end(JSON.stringify(data));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += Buffer.byteLength(chunk);
      if (size > MAX_BODY_BYTES) {
        reject(new Error('REQUEST_BODY_TOO_LARGE'));
        req.destroy();
        return;
      }
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try { resolve(JSON.parse(raw)); } catch { reject(new Error('INVALID_JSON')); }
    });
    req.on('error', reject);
  });
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : null;
}

/**
 * Resolve the caller's CloudBase user from the official HTTP API, then map it
 * to the application principal. The gateway never decodes or trusts JWT body
 * claims itself.
 */
async function verifySession(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  if (!AUTH_API_BASE_URL || !ENV_ID) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  try {
    const response = await fetch(`${AUTH_API_BASE_URL}/auth/v1/user/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        client_id: ENV_ID,
      },
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const info = payload?.data || payload?.user || payload;
    const uid = info && (info.user_id || info.sub);
    if (!uid) return null;
    const { rows } = await db.query(
      'SELECT principal_id FROM auth_subjects WHERE auth_uid = $1 AND revoked_at IS NULL LIMIT 1',
      [uid]
    );
    const principalId = rows[0] ? rows[0].principal_id : null;
    return {
      uid,
      principalId,
      email: info.email || null,
      phone: info.phone || info.phone_number || null,
      provider: info.providers?.[0]?.provider || info.provider || null,
    };
  } catch (err) {
    console.error('[verifySession] CloudBase user lookup failed:', err.message);
    return null;
  }
}

async function consumeRateQuota(scopeType, scopeKeyHash, action, windowSeconds, maxCount) {
  const { rows } = await db.query(
    'SELECT * FROM consume_rate_quota($1, $2, $3, $4, 1)',
    [scopeType, scopeKeyHash, action, windowSeconds]
  );
  if (!rows[0]) return { allowed: true, blockedUntil: null };
  const blockedUntil = rows[0].blocked_until;
  if (blockedUntil && new Date(blockedUntil).getTime() > Date.now()) {
    return { allowed: false, blockedUntil };
  }
  // Enforce max by inspecting the returned count (consume_rate_quota returns
  // the running count for this window).
  const count = Number(rows[0].count || 0);
  if (count > maxCount) {
    await db.query(
      'UPDATE auth_rate_limits SET blocked_until = now() + interval \'10 minutes\' WHERE scope_type=$1 AND scope_key_hash=$2 AND action=$3 AND window_started_at = (SELECT window_started_at FROM auth_rate_limits WHERE scope_type=$1 AND scope_key_hash=$2 AND action=$3 ORDER BY window_started_at DESC LIMIT 1)',
      [scopeType, scopeKeyHash, action]
    );
    return { allowed: false, blockedUntil: new Date(Date.now() + 10 * 60 * 1000), count };
  }
  return { allowed: true, blockedUntil: null, count };
}

async function verifyCaptcha(token, req) {
  if (!CAPTCHA_VERIFY_URL || !CAPTCHA_VERIFY_TOKEN || !token) return false;
  try {
    const response = await fetch(CAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CAPTCHA_VERIFY_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, ip: clientIp(req) }),
    });
    if (!response.ok) return false;
    const result = await response.json();
    return result.success === true;
  } catch {
    return false;
  }
}

async function writeSecurityEvent(principalId, eventType, riskLevel, req, metadata) {
  try {
    await db.query(
      `INSERT INTO auth_security_events
        (principal_id, event_type, risk_level, ip_prefix_hash, device_hash, user_agent_family, request_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        principalId,
        eventType,
        riskLevel,
        db.hashIpPrefix(clientIp(req)),
        db.hashDevice(req.headers['x-device-id']),
        req.headers['user-agent'] ? String(req.headers['user-agent']).slice(0, 80) : null,
        req.headers['x-request-id'] || null,
        JSON.stringify(metadata || {}),
      ]
    );
  } catch (err) {
    console.error('[writeSecurityEvent] failed:', err.message);
  }
}

/**
 * Build a UserProfile-shaped object (matching the web domain entity) for a
 * principal, including its masked identities.
 */
async function getProfile(principalId) {
  const p = await db.query('SELECT * FROM principals WHERE id = $1', [principalId]);
  if (!p.rows[0]) return null;
  const principal = p.rows[0];

  const i = await db.query(
    `SELECT id, provider, provider_subject, identifier_masked, is_primary, verified_at, last_used_at
       FROM user_identities WHERE principal_id = $1 AND revoked_at IS NULL
       ORDER BY is_primary DESC, created_at ASC`,
    [principalId]
  );

  const identities = i.rows.map((row) => ({
    id: String(row.id),
    provider: row.provider,
    providerSubject: row.provider_subject,
    identifierMasked: row.identifier_masked,
    isPrimary: row.is_primary,
    verifiedAt: row.verified_at ? new Date(row.verified_at).toISOString() : new Date(0).toISOString(),
    lastUsedAt: row.last_used_at ? new Date(row.last_used_at).toISOString() : null,
  }));

  const primaryEmail = i.rows.find((r) => r.provider === 'email' && r.identifier_masked);
  const email = primaryEmail ? primaryEmail.identifier_masked : null;

  return {
    principalId: String(principal.id),
    email,
    displayName: principal.display_name || null,
    avatarUrl: principal.avatar_url || null,
    locale: principal.locale || 'zh-CN',
    securityVersion: Number(principal.security_version || 1),
    identities,
  };
}

async function handleChallenges(req, res, headers, session) {
  const body = await readJsonBody(req);
  const { purpose, channel, target, device, captchaToken } = body || {};
  const idempotencyKey = req.headers['idempotency-key'];

  if (!['signup', 'signin', 'bind', 'recovery'].includes(purpose)) {
    sendJson(res, 400, { ok: false, code: 'BAD_PURPOSE', message: 'Invalid purpose.' }, headers);
    return;
  }
  if (!['sms', 'email'].includes(channel)) {
    sendJson(res, 400, { ok: false, code: 'BAD_CHANNEL', message: 'Invalid channel.' }, headers);
    return;
  }
  if (!target || typeof target !== 'string' || target.length < 3) {
    sendJson(res, 400, { ok: false, code: 'BAD_TARGET', message: 'Invalid target.' }, headers);
    return;
  }
  if ((purpose === 'bind' || purpose === 'recovery') && !session?.principalId) {
    sendJson(res, 401, { ok: false, code: 'AUTH_REQUIRED', message: 'Authentication required.' }, headers);
    return;
  }
  if (idempotencyKey && (typeof idempotencyKey !== 'string' || idempotencyKey.length > 128)) {
    sendJson(res, 400, { ok: false, code: 'BAD_IDEMPOTENCY_KEY', message: 'Invalid idempotency key.' }, headers);
    return;
  }

  if (idempotencyKey) {
    const existing = await db.query(
      `SELECT id, purpose, channel
         FROM verification_challenges
        WHERE idempotency_key = $1 AND expires_at > now()
        LIMIT 1`,
      [idempotencyKey]
    );
    if (existing.rows[0]) {
      const id = String(existing.rows[0].id);
      sendJson(res, 200, {
        ok: true,
        data: {
          id,
          challengeId: id,
          purpose: existing.rows[0].purpose,
          channel: existing.rows[0].channel,
          retryAfterSeconds: 60,
        },
      }, headers);
      return;
    }
  }

  const ip = clientIp(req);
  const targetHash = db.hashTarget(target);
  const ipHash = db.hashIpPrefix(ip);
  const deviceHash = db.hashDevice(device);

  const isSms = channel === 'sms';
  const targetRules = isSms
    ? [[60, 1, false], [900, 3, true], [3600, 5, false], [86400, 10, false]]
    : [[60, 1, false], [900, 5, true], [3600, 8, false], [86400, 20, false]];
  const scopes = [
    ...targetRules.map(([seconds, max, captcha]) => ({ type: 'target', key: targetHash, seconds, max, captcha })),
    { type: 'ip', key: ipHash, seconds: 3600, max: isSms ? 8 : 20, captcha: true },
    { type: 'device', key: deviceHash, seconds: 3600, max: isSms ? 5 : 10, captcha: true },
  ];
  let captchaRequired = false;
  for (const scope of scopes) {
    if (!scope.key) continue;
    const quota = await consumeRateQuota(
      scope.type,
      scope.key,
      `send_${channel}:${scope.type}:${scope.seconds}`,
      scope.seconds,
      scope.max
    );
    if (scope.captcha && quota.count >= Math.ceil(scope.max * 0.6)) captchaRequired = true;
    if (!quota.allowed) {
      const retryAfter = quota.blockedUntil
        ? Math.ceil((new Date(quota.blockedUntil).getTime() - Date.now()) / 1000)
        : 60;
      sendJson(
        res,
        429,
        { ok: false, code: 'RATE_LIMITED', message: 'Too many attempts. Try later.', retryAfterSeconds: retryAfter },
        headers
      );
      return;
    }
  }

  if (isSms) {
    const budget = await db.query(
      `SELECT COUNT(*)::int AS sent_today
         FROM verification_challenges
        WHERE channel = 'sms' AND created_at >= date_trunc('day', now())`,
      []
    );
    const sentToday = Number(budget.rows[0]?.sent_today || 0);
    if (sentToday >= SMS_DAILY_BUDGET || (sentToday >= Math.floor(SMS_DAILY_BUDGET * 0.95) && !['bind', 'recovery'].includes(purpose))) {
      sendJson(res, 429, { ok: false, code: 'SMS_BUDGET_EXHAUSTED', message: 'SMS delivery is temporarily unavailable.' }, headers);
      return;
    }
    if (sentToday >= Math.floor(SMS_DAILY_BUDGET * 0.85)) captchaRequired = true;
  }

  if (captchaRequired && !(await verifyCaptcha(captchaToken, req))) {
    sendJson(res, 403, { ok: false, code: 'CAPTCHA_REQUIRED', message: 'Additional verification is required.' }, headers);
    return;
  }

  const code = db.generateCode();
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_SECONDS * 1000);
  const { rows } = await db.query(
    `INSERT INTO verification_challenges
      (purpose, channel, target_hash, principal_id, ip_prefix_hash, device_hash, status, expires_at, code_hash, idempotency_key)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9)
     RETURNING id`,
    [purpose, channel, targetHash, session?.principalId || null, ipHash, deviceHash, expiresAt, db.hashCode(code), idempotencyKey || null]
  );
  const challengeId = String(rows[0].id);

  try {
    await deliverCode(channel, target, code);
  } catch (error) {
    await db.query("UPDATE verification_challenges SET status = 'blocked' WHERE id = $1", [challengeId]);
    console.error('[deliverCode] delivery failed:', error.message);
    sendJson(res, 503, { ok: false, code: 'SERVICE_TEMPORARILY_UNAVAILABLE', message: 'Verification delivery is temporarily unavailable.' }, headers);
    return;
  }

  const payload = {
    ok: true,
    data: {
      id: challengeId,
      challengeId,
      purpose,
      channel,
      retryAfterSeconds: 60,
    },
  };
  sendJson(res, 200, payload, headers);
}

async function deliverCode(channel, target, code) {
  if (channel === 'email') {
    const nodemailer = require('nodemailer');
    if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) throw new Error('SMTP is not configured');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: (process.env.SMTP_SECURE || 'true') === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: target,
      subject: '[Commit] 验证码',
      text: `你的 Commit 验证码是 ${code}，10 分钟内有效。`,
    });
    return;
  }

  const tencentcloud = require('tencentcloud-sdk-nodejs');
  const client = new tencentcloud.sms.v20210111.Client({
    credential: {
      secretId: process.env.TENCENTCLOUD_SECRET_ID,
      secretKey: process.env.TENCENTCLOUD_SECRET_KEY,
      token: process.env.TENCENTCLOUD_SESSION_TOKEN,
    },
    region: process.env.AUTH_SMS_REGION || 'ap-shanghai',
    profile: { signMethod: 'TC3-HMAC-SHA256' },
  });
  const response = await client.SendSms({
    PhoneNumberSet: [target],
    SmsSdkAppId: process.env.AUTH_SMS_SDK_APP_ID,
    SignName: process.env.AUTH_SMS_SIGN_NAME,
    TemplateId: process.env.AUTH_SMS_TEMPLATE_ID,
    TemplateParamSet: [code, String(CHALLENGE_TTL_SECONDS / 60)],
  });
  const status = response.SendStatusSet && response.SendStatusSet[0];
  if (!status || status.Code !== 'Ok') throw new Error('SMS provider rejected the message');
}

async function handleVerifyChallenge(req, res, pathname, headers) {
  const match = pathname.match(/\/v1\/auth\/challenges\/([^/]+)\/verify$/);
  const challengeId = match ? match[1] : null;
  if (!challengeId) {
    sendJson(res, 400, { ok: false, code: 'BAD_CHALLENGE', message: 'Missing challenge id.' }, headers);
    return;
  }
  const body = await readJsonBody(req);
  const code = body && body.code;
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    sendJson(res, 400, { ok: false, code: 'BAD_CODE', message: 'Invalid verification code.' }, headers);
    return;
  }

  const { rows } = await db.query(
    'SELECT * FROM verification_challenges WHERE id = $1',
    [challengeId]
  );
  const challenge = rows[0];
  if (!challenge || challenge.status !== 'pending' || new Date(challenge.expires_at) <= new Date()) {
    sendJson(res, 410, { ok: false, code: 'CHALLENGE_EXPIRED', message: 'Challenge expired.' }, headers);
    return;
  }

  const attempts = (challenge.attempt_count || 0) + 1;
  if (attempts > CHALLENGE_MAX_ATTEMPTS) {
    await db.query(
      "UPDATE verification_challenges SET status = 'blocked', attempt_count = $2 WHERE id = $1",
      [challengeId, attempts]
    );
    sendJson(res, 429, { ok: false, code: 'TOO_MANY_ATTEMPTS', message: 'Too many attempts.' }, headers);
    return;
  }

  const expected = db.hashCode(code);
  if (expected !== challenge.code_hash) {
    await db.query(
      'UPDATE verification_challenges SET attempt_count = $2 WHERE id = $1',
      [challengeId, attempts]
    );
    sendJson(res, 401, { ok: false, code: 'INVALID_CODE', message: 'Incorrect code.' }, headers);
    return;
  }

  await db.query(
    "UPDATE verification_challenges SET status = 'verified', attempt_count = $2, verified_at = now() WHERE id = $1 AND status = 'pending'",
    [challengeId, attempts]
  );

  sendJson(res, 200, { ok: true, data: { verified: true } }, headers);
}

async function handleBootstrap(req, res, session, headers) {
  if (!session || !session.uid) {
    sendJson(res, 401, { ok: false, code: 'AUTH_REQUIRED', message: 'Authentication required.' }, headers);
    return;
  }
  const body = await readJsonBody(req);
  const { displayName } = body || {};

  const existing = await db.query(
    'SELECT principal_id FROM auth_subjects WHERE auth_uid = $1 AND revoked_at IS NULL LIMIT 1',
    [session.uid]
  );
  let principalId = existing.rows[0] ? existing.rows[0].principal_id : null;

  if (!principalId) {
    const np = await db.query(
      'INSERT INTO principals (display_name, locale) VALUES ($1, $2) RETURNING id',
      [displayName || null, 'zh-CN']
    );
    principalId = np.rows[0].id;
    await db.query(
      'INSERT INTO auth_subjects (auth_uid, principal_id, is_canonical) VALUES ($1, $2, true) ON CONFLICT (auth_uid) DO UPDATE SET revoked_at = NULL',
      [session.uid, principalId]
    );
  } else if (displayName) {
    await db.query('UPDATE principals SET display_name = $2 WHERE id = $1', [principalId, displayName]);
  }

  if (session.email) {
    await upsertIdentity(
      principalId,
      'email',
      session.email,
      db.maskTarget('email', session.email)
    );
  }
  if (session.phone) {
    await upsertIdentity(
      principalId,
      'phone',
      session.phone,
      db.maskTarget('sms', session.phone)
    );
  }

  const profile = await getProfile(principalId);
  sendJson(res, 200, { ok: true, data: profile }, headers);
}

async function upsertIdentity(principalId, provider, identifier, masked) {
  const hash = db.hashTarget(identifier);
  const existing = await db.query(
    `SELECT principal_id FROM user_identities
      WHERE provider = $1 AND provider_subject = $2 AND revoked_at IS NULL
      LIMIT 1`,
    [provider, identifier]
  );
  if (existing.rows[0] && String(existing.rows[0].principal_id) !== String(principalId)) {
    const error = new Error('Identity is already linked to another account');
    error.code = provider === 'phone' ? 'PHONE_ALREADY_BOUND' : 'IDENTITY_ALREADY_LINKED';
    throw error;
  }
  await db.query(
    `INSERT INTO user_identities
      (principal_id, provider, provider_subject, identifier_hash, identifier_masked, is_primary, verified_at)
     VALUES ($1, $2, $3, $4, $5, true, now())
      ON CONFLICT (provider, provider_subject)
      DO UPDATE SET identifier_hash = $4, identifier_masked = $5, revoked_at = NULL, verified_at = now()
      WHERE user_identities.principal_id = EXCLUDED.principal_id`,
    [principalId, provider, identifier, hash, masked]
  );
}

async function handleMe(req, res, session, headers) {
  if (!session || !session.principalId) {
    sendJson(res, 401, { ok: false, code: 'AUTH_REQUIRED', message: 'Authentication required.' }, headers);
    return;
  }
  const profile = await getProfile(session.principalId);
  if (!profile) {
    sendJson(res, 404, { ok: false, code: 'PROFILE_NOT_FOUND', message: 'Profile not found.' }, headers);
    return;
  }
  sendJson(res, 200, { ok: true, data: profile }, headers);
}

async function handleBindPhone(req, res, session, headers) {
  if (!session || !session.principalId) {
    sendJson(res, 401, { ok: false, code: 'AUTH_REQUIRED', message: 'Authentication required.' }, headers);
    return;
  }
  const body = await readJsonBody(req);
  const { phone, verificationId, code } = body || {};
  if (!phone || !verificationId || !code) {
    sendJson(res, 400, { ok: false, code: 'BAD_INPUT', message: 'phone, verificationId and code are required.' }, headers);
    return;
  }

  // Re-verify the challenge server-side to keep the binding authoritative.
  const { rows } = await db.query(
    'SELECT * FROM verification_challenges WHERE id = $1',
    [verificationId]
  );
  const challenge = rows[0];
  if (!challenge || challenge.status !== 'verified' || new Date(challenge.expires_at) <= new Date()) {
    sendJson(res, 410, { ok: false, code: 'CHALLENGE_EXPIRED', message: 'Challenge expired or not verified.' }, headers);
    return;
  }
  if (db.hashCode(code) !== challenge.code_hash) {
    sendJson(res, 401, { ok: false, code: 'INVALID_CODE', message: 'Incorrect code.' }, headers);
    return;
  }

  await upsertIdentity(session.principalId, 'phone', phone, phone);
  await writeSecurityEvent(session.principalId, 'identity.bind.phone', 'low', req, { phone: db.maskTarget('sms', phone) });

  const profile = await getProfile(session.principalId);
  sendJson(res, 200, { ok: true, data: profile }, headers);
}

async function handleSecurityEvents(req, res, session, headers) {
  if (!session || !session.principalId) {
    sendJson(res, 401, { ok: false, code: 'AUTH_REQUIRED', message: 'Authentication required.' }, headers);
    return;
  }
  const { rows } = await db.query(
    `SELECT id, event_type, risk_level, created_at
       FROM auth_security_events WHERE principal_id = $1
       ORDER BY created_at DESC LIMIT 50`,
    [session.principalId]
  );
  const events = rows.map((r) => ({
    id: String(r.id),
    eventType: r.event_type,
    riskLevel: r.risk_level,
    createdAt: new Date(r.created_at).toISOString(),
  }));
  sendJson(res, 200, { ok: true, data: events }, headers);
}

async function handleMergeRequest(req, res, session, headers) {
  if (!session || !session.principalId) {
    sendJson(res, 401, { ok: false, code: 'AUTH_REQUIRED', message: 'Authentication required.' }, headers);
    return;
  }
  const body = await readJsonBody(req);
  const targetPrincipalId = body && body.targetPrincipalId;
  if (!targetPrincipalId) {
    sendJson(res, 400, { ok: false, code: 'BAD_INPUT', message: 'targetPrincipalId is required.' }, headers);
    return;
  }
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const { rows } = await db.query(
    `INSERT INTO account_merge_requests (source_principal_id, target_principal_id, expires_at)
     VALUES ($1, $2, $3) RETURNING id`,
    [session.principalId, targetPrincipalId, expiresAt]
  );
  sendJson(res, 200, { ok: true, data: { mergeRequestId: String(rows[0].id) } }, headers);
}

const server = http.createServer(async (req, res) => {
  const requestId = getRequestId();
  const origin = req.headers.origin || '';
  const cors = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    if (origin && !cors['Access-Control-Allow-Origin']) {
      sendJson(res, 403, { ok: false, code: 'ORIGIN_NOT_ALLOWED', message: 'Origin is not allowed.' }, {});
      return;
    }
    res.writeHead(204, cors);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', 'http://127.0.0.1');
  const pathname = url.pathname.replace(/\/$/, '') || '/';

  try {
    if (pathname === '/health') {
      sendJson(
        res,
        200,
        {
          ok: true,
          requestId,
          env: ENV_ID ? 'configured' : 'missing',
          db: db.isConfigured,
          cors: CORS_ALLOWED_ORIGINS.length > 0,
        },
        cors
      );
      return;
    }

    if (!db.isConfigured) {
      sendJson(res, 503, { ok: false, requestId, code: 'SERVICE_NOT_CONFIGURED', message: 'Authentication service is not configured.' }, cors);
      return;
    }

    const isPublic =
      pathname === '/v1/auth/challenges' || pathname.startsWith('/v1/auth/challenges/');
    const session = await verifySession(req.headers.authorization);

    if (!isPublic && !session) {
      sendJson(
        res,
        401,
        { ok: false, requestId, code: 'AUTH_REQUIRED', message: 'Authentication required.' },
        cors
      );
      return;
    }

    if (pathname === '/v1/auth/challenges' && req.method === 'POST') {
      await handleChallenges(req, res, cors, session);
      return;
    }

    if (pathname.startsWith('/v1/auth/challenges/') && pathname.endsWith('/verify') && req.method === 'POST') {
      await handleVerifyChallenge(req, res, pathname, cors);
      return;
    }

    if (pathname === '/v1/auth/profile/bootstrap' && req.method === 'POST') {
      await handleBootstrap(req, res, session, cors);
      return;
    }

    if (pathname === '/v1/auth/me' && req.method === 'GET') {
      await handleMe(req, res, session, cors);
      return;
    }

    if (pathname === '/v1/auth/reauth' && req.method === 'POST') {
      sendJson(res, 501, { ok: false, requestId, code: 'REAUTH_NOT_CONFIGURED', message: 'Reauthentication is not configured.' }, cors);
      return;
    }

    if (pathname === '/v1/auth/identities/phone' && req.method === 'POST') {
      sendJson(res, 403, { ok: false, requestId, code: 'REAUTH_REQUIRED', message: 'Recent reauthentication is required.' }, cors);
      return;
    }

    if (pathname.startsWith('/v1/auth/identities/') && req.method === 'DELETE') {
      sendJson(res, 501, { ok: false, requestId, code: 'IDENTITY_UNLINK_NOT_CONFIGURED', message: 'Identity unlink is not configured.' }, cors);
      return;
    }

    if (pathname === '/v1/auth/security-events' && req.method === 'GET') {
      await handleSecurityEvents(req, res, session, cors);
      return;
    }

    if (pathname === '/v1/auth/merge-requests' && req.method === 'POST') {
      sendJson(res, 501, { ok: false, requestId, code: 'MERGE_PROOF_REQUIRED', message: 'Dual-account proof is required.' }, cors);
      return;
    }

    sendJson(res, 404, { ok: false, requestId, code: 'NOT_FOUND', message: 'Endpoint not found.' }, cors);
  } catch (err) {
    console.error(`[${requestId}] unhandled error:`, err.message);
    const badRequest = err.message === 'INVALID_JSON' || err.message === 'REQUEST_BODY_TOO_LARGE';
    sendJson(
      res,
      badRequest ? 400 : 500,
      {
        ok: false,
        requestId,
        code: badRequest ? err.message : (err.code || 'SERVICE_TEMPORARILY_UNAVAILABLE'),
        message: badRequest ? 'Invalid request body.' : 'Service temporarily unavailable.',
      },
      cors
    );
  }
});

server.listen(9000, () => {
  console.log('Auth gateway listening on port 9000');
});
