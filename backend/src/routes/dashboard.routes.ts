import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { requireAuth, requireRole, requireSession } from '../middleware/auth';
import { buildRateLimiters } from '../middleware/rateLimit';

export function createDashboardRoutes(rateLimiters = buildRateLimiters()) {
  const router = Router();
  const controller = new DashboardController();
  const guard = [rateLimiters.global, requireAuth, requireSession, requireRole('MERCHANT', 'ADMIN')];

  router.get('/overview', ...guard, controller.overview);
  router.get('/transactions', ...guard, controller.transactions);
  router.get('/transactions/:reference', ...guard, controller.transactionDetail);

  return router;
}

export default createDashboardRoutes();
