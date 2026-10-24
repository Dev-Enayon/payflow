import { Prisma, type Role, type User } from '@prisma/client';
import { verify as argonVerify, hash as argonHash } from '@node-rs/argon2';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { ApiError } from '../utils/errors';
import { randomToken, sha256 } from '../utils/crypto';
import { serializeSession, serializeUser } from '../utils/serializers';

type LoginInput = {
  email: string;
  password: string;
  ip?: string;
  userAgent?: string;
};

type RegisterInput = {
  name: string;
  email: string;
  password: string;
  ip?: string;
  userAgent?: string;
};

type SessionContext = {
  ip?: string;
  userAgent?: string;
};

const passwordRules = /^(?=.*[A-Za-z])(?=.*\d).{10,}$/;

async function hashPassword(password: string): Promise<string> {
  return argonHash(password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });
}

function assertPasswordPolicy(password: string, path = 'password') {
  if (!passwordRules.test(password)) {
    throw ApiError.unprocessable(
      'Password must be at least 10 characters and include a letter and a number',
      [{ path, message: 'Use at least 10 characters with a letter and a number' }],
    );
  }
}

export class AuthService {
  async login(input: LoginInput) {
    const email = input.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    let valid = false;
    try {
      valid = await argonVerify(user.passwordHash, input.password);
    } catch {
      valid = false;
    }

    if (!valid) {
      throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    return this.createSession(user, input);
  }

  async register(input: RegisterInput) {
    assertPasswordPolicy(input.password);

    const email = input.email.trim().toLowerCase();
    const passwordHash = await hashPassword(input.password);

    let user: User;
    try {
      user = await prisma.user.create({
        data: {
          name: input.name.trim(),
          email,
          passwordHash,
          role: 'MERCHANT',
          isActive: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw ApiError.conflict('An account with that email address already exists', 'EMAIL_TAKEN');
      }
      throw error;
    }

    return this.createSession(user, input);
  }

  private async createSession(user: User, context: SessionContext) {
    const token = randomToken(48);
    const csrfToken = randomToken(32);
    const expiresAt = new Date(Date.now() + env.sessionTtlMs);

    const session = await prisma.session.create({
      data: {
        tokenHash: sha256(token),
        csrfToken,
        userId: user.id,
        expiresAt,
        ip: context.ip?.slice(0, 60),
        userAgent: context.userAgent?.slice(0, 300),
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      token,
      csrfToken,
      sessionId: session.id,
      user: serializeUser(user),
    };
  }

  async logout(sessionId: string): Promise<void> {
    await prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getSessionUser(sessionId: string) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date() || !session.user.isActive) {
      throw ApiError.unauthorized();
    }
    return { user: serializeUser(session.user), session };
  }

  async updateProfile(userId: string, input: { name?: string; email?: string }) {
    if (input.email) {
      const email = input.email.trim().toLowerCase();
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== userId) {
        throw ApiError.conflict('That email address is already in use', 'EMAIL_TAKEN');
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name ? { name: input.name.trim() } : {}),
        ...(input.email ? { email: input.email.trim().toLowerCase() } : {}),
      },
    });
    return serializeUser(user);
  }

  async changePassword(
    userId: string,
    currentSessionId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    assertPasswordPolicy(newPassword, 'newPassword');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.unauthorized();

    const valid = await argonVerify(user.passwordHash, currentPassword).catch(() => false);
    if (!valid) {
      throw ApiError.badRequest('Current password is incorrect', 'INVALID_PASSWORD');
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      prisma.session.updateMany({
        where: { userId, id: { not: currentSessionId }, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async listSessions(userId: string, currentSessionId?: string) {
    const sessions = await prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });
    return sessions.map((session) => serializeSession(session, currentSessionId));
  }

  async revokeSession(userId: string, sessionId: string, currentSessionId?: string) {
    const session = await prisma.session.findFirst({ where: { id: sessionId, userId } });
    if (!session) throw ApiError.notFound('Session not found');
    await prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
    return { revokedCurrent: sessionId === currentSessionId };
  }
}

export function getRoleLabel(role: Role): string {
  return role === 'ADMIN' ? 'Administrator' : 'Merchant';
}
