import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { parseInput } from '../utils/validation';
import { ApiError } from '../utils/errors';
import { writeAuditLog } from '../services/audit.service';
import { encryptSecret, generateWebhookSecret } from '../utils/crypto';
import { assertSafeWebhookUrl } from '../utils/url';
import { OUTBOUND_EVENTS, sendTestDelivery } from '../services/outboundWebhook.service';
import { serializeDelivery, serializeWebhookEndpoint } from '../utils/serializers';
import { WebhookDeliveryStatus, WebhookEventStatus } from '@prisma/client';
import { getPagination, paginatedResult } from '../utils/pagination';

const eventSchema = z.string().refine((value) => (OUTBOUND_EVENTS as readonly string[]).includes(value), {
  message: 'Unsupported webhook event',
});

const createSchema = z.object({
  url: z.string().url('Enter a valid webhook URL').max(2000),
  description: z.string().max(200).optional(),
  events: z.array(eventSchema).min(1, 'Select at least one event').max(20),
});

const updateSchema = z
  .object({
    url: z.string().url('Enter a valid webhook URL').max(2000).optional(),
    description: z.string().max(200).optional().nullable(),
    events: z.array(eventSchema).min(1).max(20).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Provide at least one field to update' });

const idParams = z.object({ id: z.string().cuid() });

const eventQuerySchema = z.object({
  status: z.nativeEnum(WebhookEventStatus).optional(),
  search: z.string().max(120).optional(),
});

const deliveryQuerySchema = z.object({
  status: z.nativeEnum(WebhookDeliveryStatus).optional(),
  search: z.string().max(120).optional(),
});

export class WebhookEndpointController {
  events = async (req: Request, res: Response) => {
    const pagination = getPagination(req.query, 25);
    const filters = parseInput(eventQuerySchema, req.query);
    const where = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.search
        ? {
            OR: [
              { reference: { contains: filters.search, mode: 'insensitive' as const } },
              { eventType: { contains: filters.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.webhookEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.webhookEvent.count({ where }),
    ]);
    res.json(
      paginatedResult(
        items.map((item) => ({
          id: item.id,
          eventType: item.eventType,
          reference: item.reference,
          status: item.status,
          attempts: item.attempts,
          error: item.error,
          processedAt: item.processedAt,
          createdAt: item.createdAt,
        })),
        total,
        pagination,
      ),
    );
  };

  allDeliveries = async (req: Request, res: Response) => {
    const pagination = getPagination(req.query, 25);
    const filters = parseInput(deliveryQuerySchema, req.query);
    const where = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.search
        ? {
            OR: [
              { reference: { contains: filters.search, mode: 'insensitive' as const } },
              { eventType: { contains: filters.search, mode: 'insensitive' as const } },
              { endpoint: { url: { contains: filters.search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.webhookDelivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
        include: { endpoint: { select: { url: true } } },
      }),
      prisma.webhookDelivery.count({ where }),
    ]);
    res.json(
      paginatedResult(
        items.map((item) => ({
          ...serializeDelivery(item),
          endpointUrl: item.endpoint.url,
        })),
        total,
        pagination,
      ),
    );
  };

  list = async (_req: Request, res: Response) => {
    const endpoints = await prisma.webhookEndpoint.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { deliveries: true } } },
    });
    res.json({ data: endpoints.map(serializeWebhookEndpoint) });
  };

  create = async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized();
    const body = parseInput(createSchema, req.body);
    await assertSafeWebhookUrl(body.url);

    const { secret, lastFour } = generateWebhookSecret();
    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        url: body.url,
        description: body.description ?? null,
        events: body.events,
        secretEncrypted: encryptSecret(secret),
        secretLastFour: lastFour,
        createdById: req.auth.user.id,
      },
    });

    await writeAuditLog({
      action: 'webhook.endpoint.created',
      actorId: req.auth.user.id,
      actorEmail: req.auth.user.email,
      entityType: 'webhookEndpoint',
      entityId: endpoint.id,
      metadata: { url: endpoint.url, events: endpoint.events },
      req,
    });

    res.status(201).json({
      data: {
        ...serializeWebhookEndpoint(endpoint),
        // Returned once so the merchant can configure signature verification.
        signingSecret: secret,
      },
    });
  };

  update = async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized();
    const { id } = parseInput(idParams, req.params);
    const body = parseInput(updateSchema, req.body);
    if (body.url) {
      await assertSafeWebhookUrl(body.url);
    }

    const existing = await prisma.webhookEndpoint.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Webhook endpoint not found');

    const endpoint = await prisma.webhookEndpoint.update({
      where: { id },
      data: {
        ...(body.url !== undefined ? { url: body.url } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.events !== undefined ? { events: body.events } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
      include: { _count: { select: { deliveries: true } } },
    });

    await writeAuditLog({
      action: 'webhook.endpoint.updated',
      actorId: req.auth.user.id,
      actorEmail: req.auth.user.email,
      entityType: 'webhookEndpoint',
      entityId: endpoint.id,
      metadata: { fields: Object.keys(body) },
      req,
    });

    res.json({ data: serializeWebhookEndpoint(endpoint) });
  };

  remove = async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized();
    const { id } = parseInput(idParams, req.params);
    const existing = await prisma.webhookEndpoint.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Webhook endpoint not found');
    await prisma.webhookEndpoint.delete({ where: { id } });
    await writeAuditLog({
      action: 'webhook.endpoint.deleted',
      actorId: req.auth.user.id,
      actorEmail: req.auth.user.email,
      entityType: 'webhookEndpoint',
      entityId: id,
      req,
    });
    res.status(204).send();
  };

  deliveries = async (req: Request, res: Response) => {
    const { id } = parseInput(idParams, req.params);
    const endpoint = await prisma.webhookEndpoint.findUnique({ where: { id } });
    if (!endpoint) throw ApiError.notFound('Webhook endpoint not found');
    const deliveries = await prisma.webhookDelivery.findMany({
      where: { endpointId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ data: deliveries.map(serializeDelivery) });
  };

  test = async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized();
    const { id } = parseInput(idParams, req.params);
    const endpoint = await prisma.webhookEndpoint.findUnique({ where: { id } });
    if (!endpoint) throw ApiError.notFound('Webhook endpoint not found');

    await sendTestDelivery(endpoint);
    const latest = await prisma.webhookDelivery.findFirst({
      where: { endpointId: id },
      orderBy: { createdAt: 'desc' },
    });

    await writeAuditLog({
      action: 'webhook.endpoint.tested',
      actorId: req.auth.user.id,
      actorEmail: req.auth.user.email,
      entityType: 'webhookEndpoint',
      entityId: id,
      req,
    });

    res.json({ data: latest ? serializeDelivery(latest) : null });
  };
}
