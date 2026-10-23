import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller';

export function createSettingsRoutes() {
  const router = Router();
  const controller = new SettingsController();

  router.get('/public', controller.public);

  return router;
}

export default createSettingsRoutes();
