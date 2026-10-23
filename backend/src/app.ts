import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { requestId, requestLogger } from './middleware/requestContext';
import { authenticate, csrfProtection, originGuard } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { buildRateLimiters, type RateLimitOverrides, type RateLimiters } from './middleware/rateLimit';
import { createPaystackGateway } from './services/paystack.factory';
import type { PaystackGateway } from './services/paystack.types';

import healthRoutes from './routes/health.routes';
import { createPaymentRoutes } from './routes/payment.routes';
import { createWebhookRoutes } from './routes/webhook.routes';
import { createAuthRoutes } from './routes/auth.routes';
import { createDashboardRoutes } from './routes/dashboard.routes';
import { createKeyRoutes } from './routes/key.routes';
import { createWebhookEndpointRoutes } from './routes/webhookEndpoint.routes';
import { createAdminRoutes } from './routes/admin.routes';
import { createSettingsRoutes } from './routes/settings.routes';
import { createDevRoutes } from './routes/dev.routes';

export type CreateAppOptions = {
  paystackGateway?: PaystackGateway;
  rateLimitOverrides?: RateLimitOverrides;
  rateLimiters?: RateLimiters;
};

export function createApp(options: CreateAppOptions = {}) {
  const app = express();
  const rateLimiters = options.rateLimiters ?? buildRateLimiters(options.rateLimitOverrides);
  const gateway = options.paystackGateway ?? createPaystackGateway();

  app.locals.paystackGateway = gateway;

  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(
    helmet({
      contentSecurityPolicy: env.isProduction,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(compression());
  app.use(requestId);
  app.use(requestLogger);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (env.frontendOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('CORS origin not allowed'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id'],
    }),
  );

  app.use(rateLimiters.global);

  // Must be registered before the global JSON parser: Paystack signatures are
  // computed over the raw request body.
  app.use('/api/webhooks', createWebhookRoutes(rateLimiters, gateway));
  app.use('/api/health', healthRoutes);

  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: true, limit: '256kb' }));
  app.use(cookieParser());

  app.use(originGuard);

  if (env.PAYSTACK_MOCK) {
    app.use('/api/dev', createDevRoutes());
  }

  app.use(authenticate);
  app.use(csrfProtection);

  app.use('/api/auth', createAuthRoutes(rateLimiters));
  app.use('/api/payments', createPaymentRoutes(rateLimiters, gateway));
  app.use('/api/dashboard', createDashboardRoutes(rateLimiters));
  app.use('/api/keys', createKeyRoutes(rateLimiters));
  app.use('/api/webhooks', createWebhookEndpointRoutes(rateLimiters));
  app.use('/api/admin', createAdminRoutes(rateLimiters));
  app.use('/api/settings', createSettingsRoutes());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
