import { describe, expect, it } from 'vitest';
import { parseEnv } from '../src/config/env';

const base = {
  NODE_ENV: 'development',
  PORT: '5000',
  FRONTEND_URL: 'http://localhost:5173',
  PAYSTACK_CALLBACK_URL: 'http://localhost:5173/payment/verify',
  DATABASE_URL: 'postgresql://user:password@127.0.0.1:5432/payflow',
  SESSION_SECRET: 'a'.repeat(32),
  PAYSTACK_MOCK: 'true',
  RATE_LIMITS_ENABLED: 'true',
};

const production = {
  ...base,
  NODE_ENV: 'production',
  FRONTEND_URL: 'https://payflow.example',
  PAYSTACK_CALLBACK_URL: 'https://payflow.example/payment/verify',
  PAYSTACK_MOCK: 'false',
  PAYSTACK_SECRET_KEY: 'sk_live_test_only_not_a_real_key',
};

function parse(overrides: Record<string, string>) {
  return parseEnv({ ...base, ...overrides });
}

describe('environment configuration', () => {
  it('allows mock mode without a Paystack secret key', () => {
    const env = parse({});
    expect(env.paystackMode).toBe('mock');
    expect(env.isProduction).toBe(false);
  });

  it('requires a secret key when mock mode is disabled', () => {
    expect(() => parse({ PAYSTACK_MOCK: 'false' })).toThrow(/PAYSTACK_SECRET_KEY/);
  });

  it('rejects mock mode in production', () => {
    expect(() => parse({ ...production, PAYSTACK_MOCK: 'true' })).toThrow(/PAYSTACK_MOCK/);
  });

  it('requires HTTPS origins and callbacks in production', () => {
    expect(() => parse({ ...production, FRONTEND_URL: 'http://payflow.example' })).toThrow(
      /HTTPS/,
    );
    expect(() =>
      parse({ ...production, PAYSTACK_CALLBACK_URL: 'http://payflow.example/payment/verify' }),
    ).toThrow(/HTTPS/);
  });

  it('requires a session secret and enabled rate limits in production', () => {
    expect(() => parse({ ...production, SESSION_SECRET: 'short' })).toThrow(/SESSION_SECRET/);
    expect(() => parse({ ...production, RATE_LIMITS_ENABLED: 'false' })).toThrow(
      /RATE_LIMITS_ENABLED/,
    );
  });

  it('normalizes multiple frontend origins and marks live mode', () => {
    const env = parse({
      ...production,
      FRONTEND_URL: 'https://payflow.example, https://www.payflow.example/',
    });
    expect(env.frontendOrigins).toEqual([
      'https://payflow.example',
      'https://www.payflow.example',
    ]);
    expect(env.paystackMode).toBe('live');
    expect(env.cookie.secure).toBe(true);
    expect(env.cookie.sameSite).toBe('none');
  });
});
