import type { CookieOptions } from 'express';
import { env } from '../config/env';

export function sessionCookieOptions(maxAge?: number): CookieOptions {
  return {
    httpOnly: true,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    domain: env.cookie.domain,
    path: '/',
    ...(maxAge ? { maxAge } : {}),
  };
}
