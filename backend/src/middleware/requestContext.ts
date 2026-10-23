import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export function requestId(req: Request, res: Response, next: NextFunction) {
  req.id = req.header('x-request-id')?.slice(0, 100) || crypto.randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  if (env.isTest || req.path === '/api/health') {
    return next();
  }

  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    logger.info('http_request', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Math.round(durationMs),
    });
  });

  return next();
}
