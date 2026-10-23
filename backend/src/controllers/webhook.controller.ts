import type { Request, Response } from 'express';
import { WebhookService } from '../services/webhook.service';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';

type PaystackWebhookPayload = Parameters<WebhookService['handlePaystack']>[2];

export class WebhookController {
  constructor(private readonly webhooks: WebhookService) {}

  paystack = async (req: Request, res: Response) => {
    const signature = req.header('x-paystack-signature');
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {}));

    let payload: PaystackWebhookPayload;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as PaystackWebhookPayload;
    } catch {
      throw new ApiError(400, 'INVALID_PAYLOAD', 'Webhook payload is not valid JSON');
    }

    try {
      const result = await this.webhooks.handlePaystack(rawBody, signature, payload);
      if (result.status === 'retry') {
        return res.status(503).json({ received: true, status: 'retry' });
      }
      return res.status(200).json({ received: true, status: result.status });
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({
          error: { code: error.code, message: error.message },
        });
      }
      logger.error('webhook_unhandled_error', {
        error: error instanceof Error ? error.message : 'unknown error',
      });
      return res.status(503).json({ received: true, status: 'retry' });
    }
  };
}
