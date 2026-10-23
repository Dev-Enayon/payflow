import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';
import { formatZodError } from '../utils/validation';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`Route ${req.method} ${req.path} does not exist`));
}

function bodyParserError(error: unknown): ApiError | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }
  const maybe = error as { type?: string };
  if (maybe.type === 'entity.too.large') {
    return new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
  }
  if (maybe.type === 'entity.parse.failed') {
    return new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON');
  }
  return null;
}

export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  let normalized: ApiError;

  if (error instanceof ApiError) {
    normalized = error;
  } else if (error instanceof ZodError) {
    normalized = ApiError.unprocessable(
      'Some of the submitted fields are invalid',
      formatZodError(error),
    );
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      normalized = ApiError.conflict('A record with this unique value already exists', 'DUPLICATE');
    } else if (error.code === 'P2025') {
      normalized = ApiError.notFound();
    } else {
      normalized = new ApiError(500, 'DATABASE_ERROR', 'A database error occurred');
    }
  } else {
    normalized = bodyParserError(error) ?? new ApiError(500, 'INTERNAL_ERROR', 'Something went wrong');
  }

  const safeMessage =
    normalized.statusCode >= 500 && !(error instanceof ApiError)
      ? 'Something went wrong'
      : normalized.message;

  if (normalized.statusCode >= 500) {
    logger.error('request_failed', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      status: normalized.statusCode,
      code: normalized.code,
      message: error instanceof Error ? error.message : 'unknown error',
      stack: env.isProduction ? undefined : error instanceof Error ? error.stack : undefined,
    });
  }

  res.status(normalized.statusCode).json({
    error: {
      code: normalized.code,
      message: safeMessage,
      ...(normalized.details ? { details: normalized.details } : {}),
    },
  });
};
