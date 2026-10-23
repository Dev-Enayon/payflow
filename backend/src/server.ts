import { env } from './config/env';
import { createApp } from './app';
import { prisma } from './config/prisma';
import { logger } from './utils/logger';

async function main() {
  const app = createApp();

  app.listen(env.PORT, () => {
    logger.info('server_started', {
      port: env.PORT,
      environment: env.NODE_ENV,
      paystackMode: env.paystackMode,
    });
  });

  const shutdown = async (signal: string) => {
    logger.info('shutdown_initiated', { signal });
    await prisma.$disconnect().catch(() => undefined);
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  logger.error('server_start_failed', {
    error: error instanceof Error ? error.message : 'unknown error',
  });
  process.exit(1);
});
