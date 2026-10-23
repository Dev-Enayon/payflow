import { Router } from 'express';
import { WebhookEndpointController } from '../controllers/webhookEndpoint.controller';
import { requireAuth, requireRole, requireSession } from '../middleware/auth';
import { buildRateLimiters } from '../middleware/rateLimit';

export function createWebhookEndpointRoutes(rateLimiters = buildRateLimiters()) {
  const router = Router();
  const controller = new WebhookEndpointController();
  const guard = [rateLimiters.global, requireAuth, requireSession, requireRole('MERCHANT', 'ADMIN')];

  router.get('/', ...guard, controller.list);
  router.get('/events', ...guard, controller.events);
  router.get('/deliveries', ...guard, controller.allDeliveries);
  router.post('/', ...guard, controller.create);
  router.patch('/:id', ...guard, controller.update);
  router.delete('/:id', ...guard, controller.remove);
  router.get('/:id/deliveries', ...guard, controller.deliveries);
  router.post('/:id/test', ...guard, controller.test);

  return router;
}

export default createWebhookEndpointRoutes();
