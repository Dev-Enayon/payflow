import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { sha256, timingSafeEqualStrings } from '../utils/crypto';
import { ApiError } from '../utils/errors';

const LAST_SEEN_THROTTLE_MS = 60 * 60 * 1000;

function clearSessionCookie(res: Response) {
  res.clearCookie(env.cookie.name, {
    httpOnly: true,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    domain: env.cookie.domain,
    path: '/',
  });
}

/**
 * Accepts either a secure session cookie (browser dashboard) or a PayFlow API
 * key (server-to-server integrations). It never accepts the Paystack secret.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionToken = req.cookies?.[env.cookie.name];
    if (typeof sessionToken === 'string' && sessionToken.length > 0) {
      const session = await prisma.session.findUnique({
        where: { tokenHash: sha256(sessionToken) },
        include: { user: true },
      });

      const now = new Date();
      if (session && !session.revokedAt && session.expiresAt > now && session.user.isActive) {
        req.auth = { type: 'session', user: session.user, session };
        if (now.getTime() - session.lastSeenAt.getTime() > LAST_SEEN_THROTTLE_MS) {
          void prisma.session
            .update({ where: { id: session.id }, data: { lastSeenAt: now } })
            .catch(() => undefined);
        }
        return next();
      }

      clearSessionCookie(res);
    }

    const authorization = req.headers.authorization;
    if (authorization?.startsWith('Bearer ')) {
      const rawKey = authorization.slice('Bearer '.length).trim();
      if (!rawKey.startsWith('pf_')) {
        throw ApiError.unauthorized('Invalid API key', 'INVALID_API_KEY');
      }

      const credential = await prisma.apiCredential.findUnique({
        where: { keyHash: sha256(rawKey) },
        include: { createdBy: true },
      });

      if (!credential || credential.revokedAt || !credential.createdBy.isActive) {
        throw ApiError.unauthorized('Invalid or revoked API key', 'INVALID_API_KEY');
      }

      req.auth = { type: 'apiKey', user: credential.createdBy, credential };
      void prisma.apiCredential
        .update({ where: { id: credential.id }, data: { lastUsedAt: new Date() } })
        .catch(() => undefined);
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth) {
    return next(ApiError.unauthorized());
  }
  return next();
}

/** Dashboard and admin actions require a real browser session, not an API key. */
export function requireSession(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth) {
    return next(ApiError.unauthorized());
  }
  if (req.auth.type !== 'session') {
    return next(ApiError.forbidden('This endpoint requires a signed-in session', 'SESSION_REQUIRED'));
  }
  return next();
}

export function requireRole(...roles: Array<'ADMIN' | 'MERCHANT'>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(ApiError.unauthorized());
    }
    if (!roles.includes(req.auth.user.role)) {
      return next(ApiError.forbidden('Your account role cannot access this resource', 'ROLE_FORBIDDEN'));
    }
    return next();
  };
}

export const requireAdmin = requireRole('ADMIN');


/**
 * CSRF defence-in-depth for cookie-authenticated writes:
 * - sessions carry an unguessable CSRF token that must be echoed in a header
 * - origins are validated against the configured frontend origins
 */
export function csrfProtection(req: Request, _res: Response, next: NextFunction) {
  const unsafeMethod = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  if (!unsafeMethod || req.auth?.type !== 'session') {
    return next();
  }

  const origin = req.headers.origin;
  if (origin && !env.frontendOrigins.includes(origin)) {
    return next(ApiError.forbidden('Request origin is not allowed', 'ORIGIN_FORBIDDEN'));
  }

  const headerToken = req.headers['x-csrf-token'];
  if (
    typeof headerToken !== 'string' ||
    !req.auth.session ||
    !timingSafeEqualStrings(headerToken, req.auth.session.csrfToken)
  ) {
    return next(ApiError.forbidden('Invalid or missing CSRF token', 'CSRF_FAILED'));
  }

  return next();
}

export function originGuard(req: Request, _res: Response, next: NextFunction) {
  const unsafeMethod = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  if (!unsafeMethod) {
    return next();
  }
  if (req.path.startsWith('/api/webhooks/paystack')) {
    return next();
  }
  const origin = req.headers.origin;
  if (origin && !env.frontendOrigins.includes(origin)) {
    return next(ApiError.forbidden('Request origin is not allowed', 'ORIGIN_FORBIDDEN'));
  }
  return next();
}
