import { Router } from 'express';
import { ApiKeyController } from '../controllers/apiKey.controller';
import { requireAuth, requireRole, requireSession } from '../middleware/auth';
import { buildRateLimiters } from '../middleware/rateLimit';

export function createKeyRoutes(rateLimiters = buildRateLimiters()) {
  const router = Router();
  const controller = new ApiKeyController();
  const guard = [rateLimiters.global, requireAuth, requireSession, requireRole('MERCHANT', 'ADMIN')];

  router.get('/', ...guard, controller.list);
  router.post('/', ...guard, controller.create);
  router.delete('/:id', ...guard, controller.revoke);

  return router;
}

export default createKeyRoutes();
