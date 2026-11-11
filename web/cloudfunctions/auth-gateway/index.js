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
const cloudbase = require('@cloudbase/node-sdk');
const db = require('./db');

const CORS_ALLOWED_ORIGINS = (process.env.AUTH_ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const ENV_ID = process.env.TCB_ENV_ID || process.env.CLOUDBASE_ENV_ID || '';
const DEV_MODE = process.env.AUTH_DEV_MODE === '1';

const app = ENV_ID ? cloudbase.init({ env: ENV_ID }) : null;

const CHALLENGE_TTL_SECONDS = 600; // 10 minutes
const CHALLENGE_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 60;
const RATE_LIMIT_MAX = 5;

function getRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function corsHeaders(origin) {
  const allowed = CORS_ALLOWED_ORIGINS.includes(origin)
    ? origin
    : CORS_ALLOWED_ORIGINS[0] || '*';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-Id',
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
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : null;
}

/**
 * Resolve the caller's auth_uid and principal_id from a Bearer token.
 * Returns null when unauthenticated or the token cannot be verified.
 */
async function verifySession(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  if (!app) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  try {
    const info = await app.auth().verifyToken(token);
    const uid = info && (info.uid || info.user_id || info.sub);
    if (!uid) return null;
    const { rows } = await db.query(
      'SELECT principal_id FROM auth_subjects WHERE auth_uid = $1 AND revoked_at IS NULL LIMIT 1',
      [uid]
    );
    const principalId = rows[0] ? rows[0].principal_id : null;
    return { uid, principalId };
  } catch (err) {
    console.error('[verifySession] token verification failed:', err.message);
    return null;
  }
}

async function consumeRateQuota(scopeType, scopeKeyHash, action) {
  const { rows } = await db.query(
    'SELECT * FROM consume_rate_quota($1, $2, $3, $4, 1)',
    [scopeType, scopeKeyHash, action, RATE_LIMIT_WINDOW]
  );
  if (!rows[0]) return { allowed: true, blockedUntil: null };
  const blockedUntil = rows[0].blocked_until;
  if (blockedUntil && new Date(blockedUntil).getTime() > Date.now()) {
    return { allowed: false, blockedUntil };
  }
  // Enforce max by inspecting the returned count (consume_rate_quota returns
  // the running count for this window).
  const count = rows[0].count;
  if (count > RATE_LIMIT_MAX) {
    await db.query(
      'UPDATE auth_rate_limits SET blocked_until = now() + interval \'10 minutes\' WHERE scope_type=$1 AND scope_key_hash=$2 AND action=$3 AND window_started_at = (SELECT window_started_at FROM auth_rate_limits WHERE scope_type=$1 AND scope_key_hash=$2 AND action=$3 ORDER BY window_started_at DESC LIMIT 1)',
      [scopeType, scopeKeyHash, action]
    );
    return { allowed: false, blockedUntil: new Date(Date.now() + 10 * 60 * 1000) };
  }
  return { allowed: true, blockedUntil: null };
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

async function handleChallenges(req, res, headers) {
  const body = await readJsonBody(req);
  const { purpose, channel, target, device } = body || {};

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

  const ip = clientIp(req);
  const targetHash = db.hashTarget(target);
  const ipHash = db.hashIpPrefix(ip);
  const deviceHash = db.hashDevice(device);

  // Rate limit across target / ip / device scopes.
  for (const scope of [
    { type: 'target', key: targetHash },
    { type: 'ip', key: ipHash },
    { type: 'device', key: deviceHash },
  ]) {
    if (!scope.key) continue;
    const quota = await consumeRateQuota(scope.type, scope.key, 'challenge');
    if (!quota.allowed) {
      const retryAfter = quota.blockedUntil
        ? Math.ceil((new Date(quota.blockedUntil).getTime() - Date.now()) / 1000)
        : RATE_LIMIT_WINDOW;
      sendJson(
        res,
        429,
        { ok: false, code: 'RATE_LIMITED', message: 'Too many attempts. Try later.', retryAfterSeconds: retryAfter },
        headers
      );
      return;
    }
  }

  const code = db.generateCode();
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_SECONDS * 1000);
  const { rows } = await db.query(
    `INSERT INTO verification_challenges
      (purpose, channel, target_hash, principal_id, ip_prefix_hash, device_hash, status, expires_at)
     VALUES ($1, $2, $3, NULL, $4, $5, 'pending', $6)
     RETURNING id`,
    [purpose, channel, targetHash, ipHash, deviceHash, expiresAt]
  );
  const challengeId = String(rows[0].id);

  // Delivery to SMS / email provider. When the provider is not configured the
  // code is only logged; in DEV_MODE it is returned to the client for testing.
  await deliverCode(channel, target, code);

  const payload = {
    ok: true,
    data: {
      id: challengeId,
      challengeId,
      purpose,
      channel,
      retryAfterSeconds: CHALLENGE_TTL_SECONDS,
    },
  };
  if (DEV_MODE) payload.devCode = code;
  sendJson(res, 200, payload, headers);
}

async function deliverCode(channel, target, code) {
  // TODO: wire to CloudBase SMS / Email provider once configured. Until then
  // the code is logged; DEV_MODE also exposes it to the client for E2E tests.
  console.log(`[deliverCode] channel=${channel} target=${db.maskTarget(channel, target)} code=${code}`);
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

  const expected = db.hashCode(code || '');
  if (expected !== challenge.code_hash) {
    await db.query(
      'UPDATE verification_challenges SET attempt_count = $2 WHERE id = $1',
      [challengeId, attempts]
    );
    sendJson(res, 401, { ok: false, code: 'INVALID_CODE', message: 'Incorrect code.' }, headers);
    return;
  }

  await db.query(
    "UPDATE verification_challenges SET status = 'verified', attempt_count = $2, verified_at = now() WHERE id = $1",
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
  const { email, phone, displayName } = body || {};

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

  if (email) {
    await upsertIdentity(principalId, 'email', email, email);
  }
  if (phone) {
    await upsertIdentity(principalId, 'phone', phone, phone);
  }

  const profile = await getProfile(principalId);
  sendJson(res, 200, { ok: true, data: profile }, headers);
}

async function upsertIdentity(principalId, provider, identifier, masked) {
  const hash = db.hashTarget(identifier);
  await db.query(
    `INSERT INTO user_identities
      (principal_id, provider, provider_subject, identifier_hash, identifier_masked, is_primary, verified_at)
     VALUES ($1, $2, $3, $4, $5, true, now())
     ON CONFLICT (provider, provider_subject)
     DO UPDATE SET identifier_hash = $4, identifier_masked = $5, revoked_at = NULL, verified_at = now()`,
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
        { ok: true, requestId, env: ENV_ID ? 'configured' : 'missing', db: db.isConfigured },
        cors
      );
      return;
    }

    const isPublic =
      pathname === '/v1/auth/challenges' || pathname.startsWith('/v1/auth/challenges/');
    const session = isPublic ? null : await verifySession(req.headers.authorization);

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
      await handleChallenges(req, res, cors);
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
      sendJson(res, 200, { ok: true, requestId, reauthenticatedAt: new Date().toISOString() }, cors);
      return;
    }

    if (pathname === '/v1/auth/identities/phone' && req.method === 'POST') {
      await handleBindPhone(req, res, session, cors);
      return;
    }

    if (pathname.startsWith('/v1/auth/identities/') && req.method === 'DELETE') {
      sendJson(res, 200, { ok: true, requestId }, cors);
      return;
    }

    if (pathname === '/v1/auth/security-events' && req.method === 'GET') {
      await handleSecurityEvents(req, res, session, cors);
      return;
    }

    if (pathname === '/v1/auth/merge-requests' && req.method === 'POST') {
      await handleMergeRequest(req, res, session, cors);
      return;
    }

    sendJson(res, 404, { ok: false, requestId, code: 'NOT_FOUND', message: 'Endpoint not found.' }, cors);
  } catch (err) {
    console.error(`[${requestId}] unhandled error:`, err.message);
    sendJson(
      res,
      500,
      { ok: false, requestId, code: 'SERVICE_TEMPORARILY_UNAVAILABLE', message: 'Service temporarily unavailable.' },
      cors
    );
  }
});

server.listen(9000, () => {
  console.log('Auth gateway listening on port 9000');
});
