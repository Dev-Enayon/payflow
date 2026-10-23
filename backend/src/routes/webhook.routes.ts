import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';
import { WebhookService } from '../services/webhook.service';
import { createPaystackGateway } from '../services/paystack.factory';
import { buildRateLimiters } from '../middleware/rateLimit';
import { rawJsonWebhook } from '../middleware/rawBody';
import type { PaystackGateway } from '../services/paystack.types';

export function createWebhookRoutes(
  rateLimiters = buildRateLimiters(),
  gateway: PaystackGateway = createPaystackGateway(),
) {
  const router = Router();
  const service = new WebhookService(gateway);
  const controller = new WebhookController(service);

  // Paystack webhooks arrive with the raw body for signature verification.
  router.post('/paystack', rateLimiters.webhook, rawJsonWebhook, controller.paystack);

  return router;
}
