import type { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma, TransactionStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { parseInput } from '../utils/validation';
import { getPagination, paginatedResult } from '../utils/pagination';
import { ApiError } from '../utils/errors';
import { serializePaymentDashboard } from '../utils/serializers';

const overviewQuerySchema = z.object({
  period: z.coerce.number().int().refine((value) => [7, 30, 90].includes(value)).default(30),
});

const transactionQuerySchema = z.object({
  status: z.nativeEnum(TransactionStatus).optional(),
  search: z.string().max(120).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const referenceParams = z.object({ reference: z.string().min(6).max(80) });

function toNgn(kobo: number): number {
  return Number((kobo / 100).toFixed(2));
}

function percentageChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export class DashboardController {
  overview = async (req: Request, res: Response) => {
    const { period } = parseInput(overviewQuerySchema, req.query);
    const now = new Date();
    const start = startOfUtcDay(new Date(now.getTime() - (period - 1) * 86_400_000));
    const previousStart = startOfUtcDay(new Date(start.getTime() - period * 86_400_000));

    const [currentTransactions, previousTransactions, statusGroups, recentTransactions] =
      await Promise.all([
        prisma.paymentTransaction.findMany({
          where: { createdAt: { gte: start } },
          select: { amount: true, status: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.paymentTransaction.findMany({
          where: { createdAt: { gte: previousStart, lt: start } },
          select: { amount: true, status: true },
        }),
        prisma.paymentTransaction.groupBy({
          by: ['status'],
          where: { createdAt: { gte: start } },
          _count: { _all: true },
        }),
        prisma.paymentTransaction.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
      ]);

    const summarize = (rows: Array<{ amount: number; status: TransactionStatus }>) => {
      const paid = rows.filter((tx) => tx.status === TransactionStatus.SUCCESS);
      const volume = paid.reduce((sum, tx) => sum + tx.amount, 0);
      return {
        volume,
        paidCount: paid.length,
        totalCount: rows.length,
        successRate: rows.length === 0 ? 0 : Number(((paid.length / rows.length) * 100).toFixed(1)),
        average: paid.length === 0 ? 0 : Math.round(volume / paid.length),
      };
    };

    const current = summarize(currentTransactions);
    const previous = summarize(previousTransactions);

    const seriesMap = new Map<string, { volumeKobo: number; successCount: number; count: number }>();
    for (let index = 0; index < period; index += 1) {
      const day = new Date(start.getTime() + index * 86_400_000);
      seriesMap.set(day.toISOString().slice(0, 10), { volumeKobo: 0, successCount: 0, count: 0 });
    }
    for (const tx of currentTransactions) {
      const key = tx.createdAt.toISOString().slice(0, 10);
      const bucket = seriesMap.get(key);
      if (!bucket) continue;
      bucket.count += 1;
      if (tx.status === TransactionStatus.SUCCESS) {
        bucket.successCount += 1;
        bucket.volumeKobo += tx.amount;
      }
    }

    const pendingCount = currentTransactions.filter(
      (tx) => tx.status === TransactionStatus.INITIALIZED || tx.status === TransactionStatus.PENDING,
    ).length;

    res.json({
      data: {
        period,
        mode: env.paystackMode,
        currency: 'NGN',
        metrics: {
          volumeNgn: toNgn(current.volume),
          previousVolumeNgn: toNgn(previous.volume),
          volumeChangePct: percentageChange(current.volume, previous.volume),
          successfulPayments: current.paidCount,
          previousSuccessfulPayments: previous.paidCount,
          successfulChangePct: percentageChange(current.paidCount, previous.paidCount),
          successRate: current.successRate,
          previousSuccessRate: previous.successRate,
          totalPayments: current.totalCount,
          pendingPayments: pendingCount,
          averagePaymentNgn: toNgn(current.average),
        },
        series: Array.from(seriesMap.entries()).map(([date, bucket]) => ({
          date,
          volumeNgn: toNgn(bucket.volumeKobo),
          successful: bucket.successCount,
          total: bucket.count,
        })),
        statusBreakdown: statusGroups.map((group) => ({
          status: group.status,
          count: group._count._all,
        })),
        recentTransactions: recentTransactions.map(serializePaymentDashboard),
      },
    });
  };

  transactions = async (req: Request, res: Response) => {
    const pagination = getPagination(req.query, 20);
    const filters = parseInput(transactionQuerySchema, req.query);

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
    if (!transaction) {
      throw ApiError.notFound('Transaction not found');
    }
    res.json({ data: serializePaymentDashboard(transaction) });
  };
}
