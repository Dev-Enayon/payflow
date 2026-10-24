import type { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';
import { parseInput } from '../utils/validation';
import { env } from '../config/env';
import { sessionCookieOptions } from '../utils/cookies';
import { writeAuditLog } from '../services/audit.service';
import { ApiError } from '../utils/errors';
import { serializeUser } from '../utils/serializers';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(80, 'Name must be 80 characters or fewer'),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Enter a valid email address')
      .max(254, 'Email address is too long'),
    password: z
      .string()
      .min(10, 'Password must be at least 10 characters')
      .max(128, 'Password must be 128 characters or fewer')
      .regex(/[A-Za-z]/, 'Password must include a letter')
      .regex(/\d/, 'Password must include a number'),
  })
  .strict();

const profileSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(80).optional(),
    email: z.string().email('Enter a valid email address').max(254).optional(),
  })
  .refine((value) => value.name !== undefined || value.email !== undefined, {
    message: 'Provide at least one field to update',
  });

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10).max(128),
});

const sessionParams = z.object({ id: z.string().cuid() });

export class AuthController {
  constructor(private readonly auth: AuthService) {}

  register = async (req: Request, res: Response) => {
    const body = parseInput(registerSchema, req.body);
    const result = await this.auth.register({
      name: body.name,
      email: body.email,
      password: body.password,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.cookie(env.cookie.name, result.token, sessionCookieOptions(env.sessionTtlMs));
    res.setHeader('x-csrf-token', result.csrfToken);
    await writeAuditLog({
      action: 'auth.registered',
      actorId: result.user.id,
      actorEmail: result.user.email,
      entityType: 'user',
      entityId: result.user.id,
      metadata: { role: result.user.role },
      req,
    });
    res.status(201).json({ data: { user: result.user, csrfToken: result.csrfToken } });
  };

  login = async (req: Request, res: Response) => {
    const body = parseInput(loginSchema, req.body);
    try {
      const result = await this.auth.login({
        email: body.email,
        password: body.password,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.cookie(env.cookie.name, result.token, sessionCookieOptions(env.sessionTtlMs));
      res.setHeader('x-csrf-token', result.csrfToken);
      await writeAuditLog({
        action: 'auth.login.success',
        actorId: result.user.id,
        actorEmail: result.user.email,
        req,
      });
      res.json({ data: { user: result.user, csrfToken: result.csrfToken } });
    } catch (error) {
      await writeAuditLog({
        action: 'auth.login.failed',
        actorEmail: body.email,
        metadata: { reason: error instanceof ApiError ? error.code : 'unknown' },
        req,
      });
      throw error;
    }
  };

  logout = async (req: Request, res: Response) => {
    if (req.auth?.type === 'session' && req.auth.session) {
      await this.auth.logout(req.auth.session.id);
      await writeAuditLog({
        action: 'auth.logout',
        actorId: req.auth.user.id,
        actorEmail: req.auth.user.email,
        req,
      });
    }
    res.clearCookie(env.cookie.name, sessionCookieOptions());
    res.status(204).send();
  };

  me = async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized();
    if (req.auth.type === 'session' && req.auth.session) {
      const { user } = await this.auth.getSessionUser(req.auth.session.id);
      return res.json({ data: { user, csrfToken: req.auth.session.csrfToken } });
    }
    return res.json({ data: { user: serializeUser(req.auth.user) } });
  };

  updateProfile = async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized();
    const body = parseInput(profileSchema, req.body);
    const user = await this.auth.updateProfile(req.auth.user.id, body);
    await writeAuditLog({
      action: 'auth.profile.updated',
      actorId: req.auth.user.id,
      actorEmail: req.auth.user.email,
      entityType: 'user',
      entityId: req.auth.user.id,
      metadata: { fields: Object.keys(body) },
      req,
    });
    res.json({ data: { user } });
  };

  changePassword = async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized();
    if (req.auth.type !== 'session' || !req.auth.session) {
      throw ApiError.forbidden('Password changes require a signed-in session', 'SESSION_REQUIRED');
    }
    const body = parseInput(passwordSchema, req.body);
    await this.auth.changePassword(
      req.auth.user.id,
      req.auth.session.id,
      body.currentPassword,
      body.newPassword,
    );
    await writeAuditLog({
      action: 'auth.password.changed',
      actorId: req.auth.user.id,
      actorEmail: req.auth.user.email,
      req,
    });
    res.json({ data: { message: 'Password updated. Other sessions have been signed out.' } });
  };

  sessions = async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized();
    if (req.auth.type !== 'session' || !req.auth.session) {
      throw ApiError.forbidden('Session listing requires a signed-in session', 'SESSION_REQUIRED');
    }
    const sessions = await this.auth.listSessions(req.auth.user.id, req.auth.session.id);
    res.json({ data: sessions });
  };

  revokeSession = async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized();
    if (req.auth.type !== 'session' || !req.auth.session) {
      throw ApiError.forbidden('Session revocation requires a signed-in session', 'SESSION_REQUIRED');
    }
    const { id } = parseInput(sessionParams, req.params);
    const result = await this.auth.revokeSession(req.auth.user.id, id, req.auth.session.id);
    await writeAuditLog({
      action: 'auth.session.revoked',
      actorId: req.auth.user.id,
      actorEmail: req.auth.user.email,
      entityType: 'session',
      entityId: id,
      req,
    });
    if (result.revokedCurrent) {
      res.clearCookie(env.cookie.name, sessionCookieOptions());
    }
    res.status(204).send();
  };
}
