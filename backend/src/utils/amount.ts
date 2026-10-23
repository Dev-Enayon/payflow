import { env } from '../config/env';
import { ApiError } from './errors';

export const SUPPORTED_CURRENCIES = ['NGN'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/**
 * Converts a major-unit NGN amount (e.g. "1500.50") into kobo using integer
 * arithmetic only. Paystack always expects the amount in the subunit.
 */
export function ngnToKobo(input: string | number): number {
  const raw = typeof input === 'number' ? String(input) : input.trim();

  if (!/^\d{1,10}(\.\d{1,2})?$/.test(raw)) {
    throw ApiError.unprocessable('Enter a valid amount with up to 2 decimal places', [
      { path: 'amount', message: 'Amount must be a positive number with up to 2 decimal places' },
    ]);
  }

  const [wholePart, fractionPart = ''] = raw.split('.');
  const kobo = BigInt(wholePart) * 100n + BigInt(`${fractionPart}00`.slice(0, 2));

  const minKobo = BigInt(Math.round(env.MIN_PAYMENT_AMOUNT * 100));
  const maxKobo = BigInt(Math.round(env.MAX_PAYMENT_AMOUNT * 100));

  if (kobo < minKobo) {
    throw ApiError.unprocessable(
      `The minimum payment amount is ₦${env.MIN_PAYMENT_AMOUNT.toLocaleString('en-NG')}`,
      [{ path: 'amount', message: `Amount must be at least ₦${env.MIN_PAYMENT_AMOUNT}` }],
    );
  }

  if (kobo > maxKobo) {
    throw ApiError.unprocessable(
      `The maximum payment amount is ₦${env.MAX_PAYMENT_AMOUNT.toLocaleString('en-NG')}`,
      [{ path: 'amount', message: `Amount must not exceed ₦${env.MAX_PAYMENT_AMOUNT}` }],
    );
  }

  if (kobo > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw ApiError.unprocessable('Amount is too large');
  }

  return Number(kobo);
}

export function koboToNgn(kobo: number): number {
  return kobo / 100;
}

export function assertSupportedCurrency(currency: string): SupportedCurrency {
  const normalized = currency.toUpperCase();
  if (!SUPPORTED_CURRENCIES.includes(normalized as SupportedCurrency)) {
    throw ApiError.unprocessable(`Only ${SUPPORTED_CURRENCIES.join(', ')} payments are supported`, [
      { path: 'currency', message: 'Unsupported currency' },
    ]);
  }
  return normalized as SupportedCurrency;
}
