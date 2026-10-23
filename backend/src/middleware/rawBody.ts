import type { NextFunction, Request, Response } from 'express';
import { json } from 'express';

const webhookJson = json({
  verify: (req, _res, buf) => {
    (req as Request).rawBody = buf;
  },
  limit: '1mb',
});

/** Preserve raw body for HMAC verification on Paystack webhooks. */
export function rawJsonWebhook(req: Request, res: Response, next: NextFunction) {
  webhookJson(req, res, (err) => {
    if (err) {
      return next(err);
    }
    if (Buffer.isBuffer((req as Request).rawBody)) {
      req.body = (req as Request).rawBody;
      return next();
    }
    return next();
  });
}
