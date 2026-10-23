import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { PaymentService } from '../services/payment.service';
import { createPaystackGateway } from '../services/paystack.factory';
import { requireAuth, requireRole, requireSession } from '../middleware/auth';
import { buildRateLimiters } from '../middleware/rateLimit';
import type { PaystackGateway } from '../services/paystack.types';

export function createPaymentRoutes(
  rateLimiters = buildRateLimiters(),
  gateway: PaystackGateway = createPaystackGateway(),
) {
  const router = Router();
  const service = new PaymentService(gateway);
  const controller = new PaymentController(service);

  // Public checkout endpoints
  router.post('/initialize', rateLimiters.initialize, controller.initialize);
  router.get('/verify/:reference', rateLimiters.verify, controller.verify);
  router.get('/:reference', controller.getByReference);

  // Authenticated dashboard listing
  router.get(
    '/',
    rateLimiters.global,
    requireAuth,
    requireSession,
    requireRole('MERCHANT', 'ADMIN'),
    controller.list,
  );

  return router;
}
