import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';

export type AuditAction =
  | 'auth.login.success'
  | 'auth.login.failed'
  | 'auth.logout'
  | 'auth.profile.updated'
  | 'auth.password.changed'
  | 'auth.session.revoked'
  | 'key.created'
  | 'key.revoked'
  | 'webhook.endpoint.created'
  | 'webhook.endpoint.updated'
  | 'webhook.endpoint.deleted'
  | 'webhook.endpoint.tested'
  | 'payment.verified.manually'
  | 'settings.updated';

type AuditInput = {
  action: AuditAction;
  actorId?: string | null;
  actorEmail?: string | null;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  req?: Request;
};

export async function writeAuditLog(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail ?? null,
        entityType: input.entityType,
        entityId: input.entityId,
        ip: input.req?.ip?.slice(0, 60),
        userAgent: input.req?.get('user-agent')?.slice(0, 300),
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    logger.error('audit_log_failed', {
      action: input.action,
      error: error instanceof Error ? error.message : 'unknown error',
    });
  }
}
