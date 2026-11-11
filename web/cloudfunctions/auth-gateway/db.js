/**
 * Auth Gateway - data access helpers.
 *
 * Uses a direct PostgreSQL connection (server-side, service role equivalent) so
 * it bypasses client RLS. The connection string is injected by CloudBase as an
 * environment variable. Hashing uses server-side HMAC peppers; no identifier
 * or OTP is stored in plaintext.
 */

const { Pool } = require('pg');
const crypto = require('crypto');

const connectionString =
  process.env.PG_CONNECTION_STRING ||
  process.env.AUTH_PG_CONNECTION_STRING ||
  process.env.DATABASE_URL ||
  '';

if (!connectionString) {
  // Surface early but do not crash the process; health check will report it.
  console.error('[auth-gateway] PG_CONNECTION_STRING is not configured');
}

const pool = new Pool({
  connectionString,
  max: 5,
  ssl: process.env.PG_NO_SSL === '1' ? false : { rejectUnauthorized: false },
});

const HMAC_PEPPER = process.env.AUTH_HMAC_PEPPER || process.env.AUTH_CHALLENGE_PEPPER || '';
const CHALLENGE_PEPPER = process.env.AUTH_CHALLENGE_PEPPER || HMAC_PEPPER;

if (!HMAC_PEPPER || !CHALLENGE_PEPPER) {
  console.error('[auth-gateway] AUTH_HMAC_PEPPER and AUTH_CHALLENGE_PEPPER are required');
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hmacHex(value) {
  if (!HMAC_PEPPER) throw new Error('AUTH_HMAC_PEPPER is not configured');
  return crypto.createHmac('sha256', HMAC_PEPPER).update(value).digest('hex');
}

function hashTarget(target) {
  return hmacHex(`target:${String(target).trim().toLowerCase()}`);
}

function hashIpPrefix(ip) {
  if (!ip) return null;
  const prefix = ip.includes(':')
    ? ip.split(':').slice(0, 4).join(':')
    : ip.split('.').slice(0, 3).join('.');
  return hmacHex(`ip:${prefix}`);
}

function hashDevice(device) {
  if (!device) return null;
  return hmacHex(`device:${device}`);
}

function maskEmail(email) {
  const parts = String(email).split('@');
  if (parts.length !== 2) return '***';
  const name = parts[0];
  const head = name.slice(0, 1);
  const tail = name.length > 1 ? name.slice(-1) : '';
  return `${head}***${tail}@${parts[1]}`;
}

function maskPhone(phone) {
  const s = String(phone);
  if (s.length <= 4) return '***';
  return `${s.slice(0, 3)}****${s.slice(-2)}`;
}

function maskTarget(channel, target) {
  return channel === 'email' ? maskEmail(target) : maskPhone(target);
}

function generateCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

function hashCode(code) {
  if (!CHALLENGE_PEPPER) throw new Error('AUTH_CHALLENGE_PEPPER is not configured');
  return crypto.createHmac('sha256', CHALLENGE_PEPPER).update(String(code)).digest('hex');
}

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  sha256Hex,
  hashTarget,
  hashIpPrefix,
  hashDevice,
  maskTarget,
  generateCode,
  hashCode,
  isConfigured: Boolean(connectionString && HMAC_PEPPER && CHALLENGE_PEPPER),
};
