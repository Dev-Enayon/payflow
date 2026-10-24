import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { requireAuth } from '../middleware/auth';
import { buildRateLimiters } from '../middleware/rateLimit';

export function createAuthRoutes(rateLimiters = buildRateLimiters()) {
  const router = Router();
  const service = new AuthService();
  const controller = new AuthController(service);

  router.post('/register', rateLimiters.login, controller.register);
  router.post('/login', rateLimiters.login, controller.login);
  router.post('/logout', requireAuth, controller.logout);
  router.get('/me', requireAuth, controller.me);
  router.patch('/profile', requireAuth, controller.updateProfile);
  router.post('/change-password', requireAuth, controller.changePassword);
  router.get('/sessions', requireAuth, controller.sessions);
  router.delete('/sessions/:id', requireAuth, controller.revokeSession);

  return router;
}

export default createAuthRoutes();
