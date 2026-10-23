import { rateLimit, type RateLimitRequestHandler } from 'express-rate-limit';
import type { Request, Response } from 'express';
import { env } from '../config/env';

export type RateLimitConfig = {
  enabled?: boolean;
  windowMs?: number;
  limit?: number;
};

export type RateLimitOverrides = Partial<
  Record<'global' | 'login' | 'initialize' | 'verify' | 'webhook', RateLimitConfig>
>;

export type RateLimiters = {
  global: RateLimitRequestHandler;
  login: RateLimitRequestHandler;
  initialize: RateLimitRequestHandler;
  verify: RateLimitRequestHandler;
  webhook: RateLimitRequestHandler;
};

function handler(_req: Request, res: Response) {
  res.status(429).json({
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please slow down and try again shortly.',
    },
  });
}

function createLimiter(defaults: Required<Omit<RateLimitConfig, 'enabled'>> & { enabled: boolean }) {
  return rateLimit({
    windowMs: defaults.windowMs,
    limit: defaults.limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => !defaults.enabled,
    handler,
  });
}

export function buildRateLimiters(overrides: RateLimitOverrides = {}): RateLimiters {
  const resolve = (
    name: keyof RateLimitOverrides,
    defaults: { windowMs: number; limit: number },
  ) => ({
    enabled: overrides[name]?.enabled ?? env.RATE_LIMITS_ENABLED,
    windowMs: overrides[name]?.windowMs ?? defaults.windowMs,
    limit: overrides[name]?.limit ?? defaults.limit,
  });

  return {
    global: createLimiter(resolve('global', { windowMs: 15 * 60 * 1000, limit: 600 })),
    login: createLimiter(
      resolve('login', { windowMs: 15 * 60 * 1000, limit: env.LOGIN_RATE_LIMIT }),
    ),
    initialize: createLimiter(
      resolve('initialize', { windowMs: 10 * 60 * 1000, limit: env.INIT_RATE_LIMIT }),
    ),
    verify: createLimiter(
      resolve('verify', { windowMs: 60 * 1000, limit: env.VERIFY_RATE_LIMIT }),
    ),
    webhook: createLimiter(resolve('webhook', { windowMs: 60 * 1000, limit: 300 })),
  };
}
