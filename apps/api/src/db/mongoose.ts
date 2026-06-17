import mongoose from 'mongoose';
import { logger } from '../config/logger.js';

mongoose.set('strictQuery', true);

export async function connectMongo(uri: string): Promise<typeof mongoose> {
  mongoose.connection.on('connected', () => logger.info('mongo: connected'));
  mongoose.connection.on('error', (err) => logger.error({ err }, 'mongo: error'));
  mongoose.connection.on('disconnected', () => logger.warn('mongo: disconnected'));

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
  });
  // Build declared indexes (e.g. unique sparse on email / lineUserId).
  await mongoose.syncIndexes();
  return mongoose;
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}

// Lightweight health probe for /health.
export function mongoStatus(): 'up' | 'down' {
  return mongoose.connection.readyState === 1 ? 'up' : 'down';
}
