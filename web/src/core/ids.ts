/**
 * ID 入口（docs/CODE-STRUCTURE.md §2）。
 *
 * 主键统一 ULID：26 位 Crockford Base32，时间部分取注入时钟的毫秒，
 * 字典序即时间序，V2 迁移可直接作为云端 `_id`（TECH §5.3）。
 */

const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const TIME_LEN = 10;
const RANDOM_LEN = 16;

export interface IdSource {
  /** 生成 ULID；时间部分取传入的毫秒，保证与注入时钟同源。 */
  ulid(now: number): string;
}

function encodeTime(epochMs: number): string {
  let remaining = Math.max(0, Math.floor(epochMs));
  let out = '';
  for (let i = 0; i < TIME_LEN; i += 1) {
    const mod = remaining % 32;
    out = ENCODING[mod] + out;
    remaining = (remaining - mod) / 32;
  }
  return out;
}

function randomChars(): string {
  const bytes = new Uint8Array(RANDOM_LEN);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < RANDOM_LEN; i += 1) out += ENCODING[bytes[i] % 32];
  return out;
}

export function ulid(now: number): string {
  return encodeTime(now) + randomChars();
}

export const systemIds: IdSource = { ulid };
