import { resolve } from 'node:path';
import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { env, isTest } from './config/env.js';
import { logger } from './config/logger.js';
import { requestId } from './middleware/requestId.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { meRouter } from './routes/me.js';
import { birdsRouter } from './routes/birds.js';
import { uploadsRouter } from './routes/uploads.js';

// Build the Express app with NO external connections — safe to import in tests.
export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1); // correct client IPs behind a proxy (rate-limit)
  app.use(requestId);
  if (!isTest) {
    app.use(pinoHttp({ logger, customProps: (req) => ({ requestId: req.id }) }));
  }
  // Allow API-served media (posters, photos) to be embedded by the web origin.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: env.WEB_ORIGIN.split(',').map((s) => s.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // Serve locally-stored media (no-op when Cloudinary is configured).
  app.use('/uploads', express.static(resolve(process.cwd(), env.UPLOAD_DIR)));

  app.use(healthRouter);
  app.use(authRouter);
  app.use(meRouter);
  app.use(birdsRouter);
  app.use(uploadsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
