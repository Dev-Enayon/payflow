import crypto from 'node:crypto';
import { env } from '../config/env';

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function randomHex(bytes = 16): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufferA, bufferB);
}

export function hmacSha512Hex(payload: string | Buffer, secret: string): string {
  return crypto.createHmac('sha512', secret).update(payload).digest('hex');
}

export function hmacSha256Hex(payload: string | Buffer, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Paystack signs the raw webhook request body with HMAC-SHA512 using the
 * account secret key and sends the digest in the x-paystack-signature header.
 */
export function verifyPaystackSignature(
  rawBody: Buffer | string,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature || !/^[a-f0-9]{128}$/i.test(signature)) {
    return false;
  }
  const expected = hmacSha512Hex(rawBody, secret);
  return timingSafeEqualStrings(expected.toLowerCase(), signature.toLowerCase());
}

function encryptionKey(): Buffer {
  const source = env.ENCRYPTION_KEY || env.SESSION_SECRET;
  return crypto.createHash('sha256').update(`${source}:payflow-webhook-secrets`).digest();
}

/** Encrypts a webhook signing secret at rest using AES-256-GCM. */
export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function decryptSecret(payload: string): string {
  const [ivPart, tagPart, encryptedPart] = payload.split('.');
  if (!ivPart || !tagPart || !encryptedPart) {
    throw new Error('Invalid encrypted secret payload');
  }
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(ivPart, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, 'base64url')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) {
    return '***';
  }
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(2, local.length - visible.length))}@${domain}`;
}

export function generateTransactionReference(): string {
  const time = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(5).toString('hex').toUpperCase();
  return `PF-${time}-${random}`;
}

export function generateApiKey(environment: 'TEST' | 'LIVE'): { key: string; prefix: string; lastFour: string } {
  const marker = environment === 'LIVE' ? 'live' : 'test';
  const secret = crypto.randomBytes(32).toString('base64url');
  const key = `pf_${marker}_${secret}`;
  return {
    key,
    prefix: key.slice(0, 12),
    lastFour: key.slice(-4),
  };
}

export function generateWebhookSecret(): { secret: string; lastFour: string } {
  const secret = `whsec_${crypto.randomBytes(32).toString('base64url')}`;
  return { secret, lastFour: secret.slice(-4) };
}
