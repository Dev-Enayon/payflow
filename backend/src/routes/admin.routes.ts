import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { requireAdmin, requireAuth, requireSession } from '../middleware/auth';
import { buildRateLimiters } from '../middleware/rateLimit';

export function createAdminRoutes(rateLimiters = buildRateLimiters()) {
  const router = Router();
  const controller = new AdminController();
  const guard = [rateLimiters.global, requireAuth, requireSession, requireAdmin];

  router.get('/overview', ...guard, controller.overview);
  router.get('/users', ...guard, controller.users);
  router.get('/transactions', ...guard, controller.transactions);
  router.get('/transactions/:reference', ...guard, controller.transactionDetail);
  router.get('/audit-logs', ...guard, controller.auditLogs);
  router.get('/webhook-events', ...guard, controller.webhookEvents);
  router.get('/webhook-deliveries', ...guard, controller.webhookDeliveries);
  router.get('/settings', ...guard, controller.settings);
  router.patch('/settings', ...guard, controller.updateSettings);

  return router;
}

export default createAdminRoutes();
