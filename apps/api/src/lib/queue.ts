import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { logger } from '../config/logger.js';

/**
 * Swappable dispatch-queue interface (spec §5: "keep it swappable").
 * Phase 0 only wires the connection and proves it is reachable — there are no
 * producers or consumers yet. The tiered dispatch worker (spec §8B) is Phase 2/3.
 */
export interface DispatchJob {
  lostReportId: string;
  reason: 'lost_report_created' | 'sighting_confirmed';
}

export interface JobQueue {
  readonly name: string;
  enqueue(job: DispatchJob): Promise<void>;
  ping(): Promise<boolean>;
  close(): Promise<void>;
}

class BullDispatchQueue implements JobQueue {
  readonly name = 'dispatch';
  private connection: Redis;
  private queue: Queue<DispatchJob>;

  constructor(redisUrl: string) {
    // lazyConnect so a missing Redis doesn't crash API boot in Phase 0.
    this.connection = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
    this.connection.on('error', (err: Error) => logger.warn({ err }, 'redis: error'));
    this.queue = new Queue<DispatchJob>(this.name, { connection: this.connection });
  }

  async connect(): Promise<void> {
    try {
      await this.connection.connect();
      logger.info('redis: connected (dispatch queue ready)');
    } catch (err) {
      logger.warn({ err }, 'redis: connect failed — dispatch queue unavailable (Phase 0 ok)');
    }
  }

  async enqueue(job: DispatchJob): Promise<void> {
    await this.queue.add(job.reason, job);
  }

  async ping(): Promise<boolean> {
    try {
      if (this.connection.status !== 'ready') return false;
      return (await this.connection.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.queue.close();
    this.connection.disconnect();
  }
}

let instance: BullDispatchQueue | null = null;

export async function initQueue(redisUrl: string): Promise<JobQueue> {
  instance = new BullDispatchQueue(redisUrl);
  await instance.connect();
  return instance;
}

export function getQueue(): JobQueue {
  if (!instance) throw new Error('Queue not initialised — call initQueue() first');
  return instance;
}

export async function queueStatus(): Promise<'up' | 'down'> {
  if (!instance) return 'down';
  return (await instance.ping()) ? 'up' : 'down';
}

export async function closeQueue(): Promise<void> {
  if (instance) {
    await instance.close();
    instance = null;
  }
}
