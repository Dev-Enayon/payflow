import type { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { env } from '../config/env';

export async function health(_req: Request, res: Response) {
  let db: 'ok' | 'down' = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = 'down';
  }

  res.status(db === 'ok' ? 200 : 503).json({
    status: db === 'ok' ? 'ok' : 'degraded',
    service: 'payflow-backend',
    version: '1.0.0',
    environment: env.NODE_ENV,
    paystackMode: env.paystackMode,
    database: db,
    timestamp: new Date().toISOString(),
  });
}
