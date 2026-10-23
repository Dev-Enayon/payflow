import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  Prisma,
  TransactionStatus,
  WebhookDeliveryStatus,
  WebhookEventStatus,
} from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { parseInput } from '../utils/validation';
import { getPagination, paginatedResult } from '../utils/pagination';
import { ApiError } from '../utils/errors';
import {
  serializeAuditLog,
  serializeDelivery,
  serializePaymentDashboard,
  serializeUser,
} from '../utils/serializers';
import { writeAuditLog } from '../services/audit.service';
import { getSettings, updateSettings } from '../services/settings.service';

const transactionQuerySchema = z.object({
  status: z.nativeEnum(TransactionStatus).optional(),
  search: z.string().max(120).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const auditQuerySchema = z.object({
  action: z.string().max(120).optional(),
  search: z.string().max(120).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const eventQuerySchema = z.object({
  status: z.nativeEnum(WebhookEventStatus).optional(),
  search: z.string().max(120).optional(),
});

const deliveryQuerySchema = z.object({
  status: z.nativeEnum(WebhookDeliveryStatus).optional(),
  search: z.string().max(120).optional(),
});

const referenceParams = z.object({ reference: z.string().min(6).max(80) });

const settingsSchema = z.object({
  brandName: z.string().min(1).max(60),
  businessName: z.string().min(1).max(120),
  supportEmail: z.string().email().max(254),
  website: z.string().url().max(300).optional().nullable().or(z.literal('')),
  defaultCurrency: z.literal('NGN'),
});

function toNgn(kobo: number): number {
  return Number((kobo / 100).toFixed(2));
}

function buildTransactionWhere(filters: z.infer<typeof transactionQuerySchema>) {
  const where: Prisma.PaymentTransactionWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.search) {
    where.OR = [
      { reference: { contains: filters.search, mode: 'insensitive' } },
      { customerEmail: { contains: filters.search, mode: 'insensitive' } },
      { customerName: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) where.createdAt.gte = filters.from;
    if (filters.to) where.createdAt.lte = filters.to;
  }
  return where;
}

export class AdminController {
  overview = async (_req: Request, res: Response) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);

    const [
      users,
      transactions,
      successful,
      volume,
      todayPayments,
      todaySuccessful,
      events,
      deliveries,
      recentAudit,
      recentTransactions,
      last30Days,
      roles,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.paymentTransaction.count(),
      prisma.paymentTransaction.count({ where: { status: TransactionStatus.SUCCESS } }),
      prisma.paymentTransaction.aggregate({
        where: { status: TransactionStatus.SUCCESS },
        _sum: { amount: true },
      }),
      prisma.paymentTransaction.count({
        where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
      prisma.paymentTransaction.count({
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          status: TransactionStatus.SUCCESS,
        },
      }),
      prisma.webhookEvent.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.webhookDelivery.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 12 }),
      prisma.paymentTransaction.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
      prisma.paymentTransaction.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true, status: true, amount: true },
      }),
      prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    ]);

    const seriesMap = new Map<string, { volumeKobo: number; successful: number; total: number }>();
    for (const tx of last30Days) {
      const key = tx.createdAt.toISOString().slice(0, 10);
      const bucket = seriesMap.get(key) ?? { volumeKobo: 0, successful: 0, total: 0 };
      bucket.total += 1;
      if (tx.status === TransactionStatus.SUCCESS) {
        bucket.successful += 1;
        bucket.volumeKobo += tx.amount;
      }
      seriesMap.set(key, bucket);
    }

    const eventMap = Object.fromEntries(events.map((item) => [item.status, item._count._all]));
    const deliveryMap = Object.fromEntries(deliveries.map((item) => [item.status, item._count._all]));

    res.json({
      data: {
        mode: env.paystackMode,
        users,
        roles: Object.fromEntries(roles.map((role) => [role.role, role._count._all])),
        transactions,
        successful,
        successRate: transactions === 0 ? 0 : Number(((successful / transactions) * 100).toFixed(1)),
        volumeNgn: toNgn(volume._sum.amount ?? 0),
        today: { payments: todayPayments, successful: todaySuccessful },
        webhooks: {
          received: events.reduce((sum, item) => sum + item._count._all, 0),
          processed: eventMap.PROCESSED ?? 0,
          failed: eventMap.FAILED ?? 0,
          ignored: eventMap.IGNORED ?? 0,
        },
        deliveries: {
          total: deliveries.reduce((sum, item) => sum + item._count._all, 0),
          success: deliveryMap.SUCCESS ?? 0,
          failed: deliveryMap.FAILED ?? 0,
          pending: deliveryMap.PENDING ?? 0,
        },
        series: Array.from(seriesMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, bucket]) => ({
            date,
            volumeNgn: toNgn(bucket.volumeKobo),
            successful: bucket.successful,
            total: bucket.total,
          })),
        recentTransactions: recentTransactions.map(serializePaymentDashboard),
        recentAudit: recentAudit.map(serializeAuditLog),
      },
    });
  };

  transactions = async (req: Request, res: Response) => {
    const pagination = getPagination(req.query, 50);
    const filters = parseInput(transactionQuerySchema, req.query);
    const where = buildTransactionWhere(filters);
    const [items, total] = await Promise.all([
      prisma.paymentTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.paymentTransaction.count({ where }),
    ]);
    res.json(paginatedResult(items.map(serializePaymentDashboard), total, pagination));
  };

  transactionDetail = async (req: Request, res: Response) => {
    const { reference } = parseInput(referenceParams, req.params);
    const transaction = await prisma.paymentTransaction.findUnique({ where: { reference } });
    if (!transaction) throw ApiError.notFound('Transaction not found');
    res.json({ data: serializePaymentDashboard(transaction) });
  };

  users = async (_req: Request, res: Response) => {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    res.json({ data: users.map(serializeUser) });
  };

  auditLogs = async (req: Request, res: Response) => {
    const pagination = getPagination(req.query, 50);
    const filters = parseInput(auditQuerySchema, req.query);
    const where: Prisma.AuditLogWhereInput = {};
    if (filters.action) where.action = { contains: filters.action, mode: 'insensitive' };
    if (filters.search) {
      where.OR = [
        { actorEmail: { contains: filters.search, mode: 'insensitive' } },
        { action: { contains: filters.search, mode: 'insensitive' } },
        { entityId: { contains: filters.search, mode: 'insensitive' } },
        { entityType: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = filters.from;
      if (filters.to) where.createdAt.lte = filters.to;
    }
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json(paginatedResult(items.map(serializeAuditLog), total, pagination));
  };

  webhookEvents = async (req: Request, res: Response) => {
    const pagination = getPagination(req.query, 50);
    const filters = parseInput(eventQuerySchema, req.query);
    const where: Prisma.WebhookEventWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { reference: { contains: filters.search, mode: 'insensitive' } },
        { eventType: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
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
          payload: item.payload,
        })),
        total,
        pagination,
      ),
    );
  };

  webhookDeliveries = async (req: Request, res: Response) => {
    const pagination = getPagination(req.query, 50);
    const filters = parseInput(deliveryQuerySchema, req.query);
    const where: Prisma.WebhookDeliveryWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { reference: { contains: filters.search, mode: 'insensitive' } },
        { eventType: { contains: filters.search, mode: 'insensitive' } },
        { endpoint: { url: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }
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
        items.map((item) => ({ ...serializeDelivery(item), endpointUrl: item.endpoint.url })),
        total,
        pagination,
      ),
    );
  };

  settings = async (_req: Request, res: Response) => {
    const settings = await getSettings();
    res.json({
      data: {
        ...settings,
        callbackUrl: env.PAYSTACK_CALLBACK_URL,
        webhookUrl: '/api/webhooks/paystack',
        mode: env.paystackMode,
      },
    });
  };

  updateSettings = async (req: Request, res: Response) => {
    if (!req.auth) throw ApiError.unauthorized();
    const body = parseInput(settingsSchema, req.body);
    const settings = await updateSettings({
      brandName: body.brandName,
      businessName: body.businessName,
      supportEmail: body.supportEmail,
      website: body.website === '' ? null : (body.website ?? null),
      defaultCurrency: body.defaultCurrency,
    });
    await writeAuditLog({
      action: 'settings.updated',
      actorId: req.auth.user.id,
      actorEmail: req.auth.user.email,
      entityType: 'settings',
      entityId: 'default',
      metadata: { fields: Object.keys(body) },
      req,
    });
    res.json({ data: settings });
  };
}
