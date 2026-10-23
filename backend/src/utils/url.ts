import dns from 'node:dns/promises';
import net from 'node:net';
import { env } from '../config/env';
import { ApiError } from './errors';

const PRIVATE_V4 = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const;

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  return PRIVATE_V4.some(([base, bits]) => {
    const mask = (~0 << (32 - bits)) >>> 0;
    return (value & mask) === (ipv4ToInt(base) & mask);
  });
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) {
    return true;
  }
  if (normalized.startsWith('::ffff:')) {
    const mapped = normalized.replace('::ffff:', '');
    return net.isIP(mapped) === 4 ? isPrivateIPv4(mapped) : true;
  }
  return false;
}

function isLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === 'localhost' || host.endsWith('.localhost');
}

function isLocalDevUrl(url: URL): boolean {
  return (
    !env.isProduction &&
    (url.protocol === 'http:' || url.protocol === 'https:') &&
    (isLocalHostname(url.hostname) || url.hostname === '127.0.0.1' || url.hostname === '::1')
  );
}

/**
 * Blocks SSRF targets for outbound merchant webhooks. Local HTTP endpoints are
 * permitted only outside production for local testing.
 */
export async function assertSafeWebhookUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw ApiError.unprocessable('Enter a valid webhook URL');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw ApiError.unprocessable('Webhook URL must use HTTP or HTTPS');
  }
  if (url.username || url.password) {
    throw ApiError.unprocessable('Webhook URLs cannot contain credentials');
  }
  if (env.isProduction && url.protocol !== 'https:') {
    throw ApiError.unprocessable('Webhook URLs must use HTTPS in production');
  }
  if (isLocalDevUrl(url)) {
    return url;
  }
  if (isLocalHostname(url.hostname)) {
    throw ApiError.unprocessable('Local webhook URLs are not allowed');
  }

  const host = url.hostname;
  if (net.isIP(host)) {
    const isPrivate = net.isIP(host) === 4 ? isPrivateIPv4(host) : isPrivateIPv6(host);
    if (isPrivate) {
      throw ApiError.unprocessable('Webhook URL resolves to a private network address');
    }
    return url;
  }

  let records: Array<{ address: string; family: number }>;
  try {
    records = await dns.lookup(host, { all: true });
  } catch {
    throw ApiError.unprocessable('Webhook hostname could not be resolved');
  }

  if (records.length === 0) {
    throw ApiError.unprocessable('Webhook hostname could not be resolved');
  }

  for (const record of records) {
    const isPrivate =
      record.family === 4 ? isPrivateIPv4(record.address) : isPrivateIPv6(record.address);
    if (isPrivate) {
      throw ApiError.unprocessable('Webhook URL resolves to a private network address');
    }
  }

  return url;
}
