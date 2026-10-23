import type { Request, Response } from 'express';
import { z } from 'zod';
import { ApiKeyEnvironment } from '@prisma/client';
import { prisma } from '../config/prisma';
import { parseInput } from '../utils/validation';
import { generateApiKey, sha256 } from '../utils/crypto';
import { ApiError } from '../utils/errors';
import { writeAuditLog } from '../services/audit.service';
import { serializeApiKey } from '../utils/serializers';

const createSchema = z.object({
  name: z.string().min(1, 'Provide a name for this key').max(80),
  environment: z.enum(['TEST', 'LIVE']).default('TEST'),
});

const idParams = z.object({ id: z.string().cuid() });

export class ApiKeyController {
  list = async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized();
    const keys = await prisma.apiCredential.findMany({
      where: { createdById: req.auth.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: keys.map(serializeApiKey) });
  };

  create = async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized();
    const body = parseInput(createSchema, req.body);
    const environment = body.environment as ApiKeyEnvironment;
    const { key, prefix, lastFour } = generateApiKey(environment);

    const credential = await prisma.apiCredential.create({
      data: {
        name: body.name,
        keyPrefix: prefix,
        keyHash: sha256(key),
        lastFour,
        environment,
        createdById: req.auth.user.id,
      },
    });

    await writeAuditLog({
      action: 'key.created',
      actorId: req.auth.user.id,
      actorEmail: req.auth.user.email,
      entityType: 'apiKey',
      entityId: credential.id,
      metadata: { environment, name: body.name },
      req,
    });

    res.status(201).json({
      data: {
        ...serializeApiKey(credential),
        // Shown once at creation time only; only the hash is persisted.
        key,
      },
    });
  };

  revoke = async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized();
    const { id } = parseInput(idParams, req.params);
    const credential = await prisma.apiCredential.findUnique({ where: { id } });
    if (!credential || credential.createdById !== req.auth.user.id) {
      throw ApiError.notFound('API key not found');
    }
    if (credential.revokedAt) {
      return res.status(204).send();
    }
    await prisma.apiCredential.update({ where: { id }, data: { revokedAt: new Date() } });
    await writeAuditLog({
      action: 'key.revoked',
      actorId: req.auth.user.id,
      actorEmail: req.auth.user.email,
      entityType: 'apiKey',
      entityId: credential.id,
      req,
    });
    res.status(204).send();
  };
}
