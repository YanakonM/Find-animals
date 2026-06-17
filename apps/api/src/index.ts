import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectMongo, disconnectMongo } from './db/mongoose.js';
import { configureCloudinary } from './lib/cloudinary.js';
import { initQueue, closeQueue } from './lib/queue.js';

async function main(): Promise<void> {
  // Wire external dependencies, then start serving.
  await connectMongo(env.MONGODB_URI);
  configureCloudinary();
  await initQueue(env.REDIS_URL); // resilient: logs a warning if Redis is down

  const app = createApp();
  const server = app.listen(env.API_PORT, () => {
    logger.info(`homeward-api listening on http://localhost:${env.API_PORT}`);
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down');
    server.close();
    await closeQueue();
    await disconnectMongo();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error({ err }, 'fatal: failed to start');
  process.exit(1);
});
