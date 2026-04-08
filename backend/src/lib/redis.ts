import Redis from 'ioredis';
import { logger } from './logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const createRedisClient = (): Redis => {
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy(times: number): number | null {
      const delay = Math.min(times * 100, 3000);
      if (times > 10) {
        logger.error(`Redis: Unable to connect after ${times} attempts. Giving up.`);
        return null; // stop retrying
      }
      logger.warn(`Redis: Reconnecting attempt ${times} in ${delay}ms`);
      return delay;
    },
    reconnectOnError(err: Error): boolean | 1 | 2 {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ECONNREFUSED'];
      if (targetErrors.some((e) => err.message.includes(e))) {
        return 2; // reconnect and resend the failed command
      }
      return false;
    },
  });

  client.on('connect', () => {
    logger.info('Redis: Connected successfully');
  });

  client.on('ready', () => {
    logger.info('Redis: Client ready');
  });

  client.on('error', (err: Error) => {
    logger.error(`Redis Error: ${err.message}`);
  });

  client.on('close', () => {
    logger.warn('Redis: Connection closed');
  });

  client.on('reconnecting', (delay: number) => {
    logger.info(`Redis: Reconnecting in ${delay}ms`);
  });

  client.on('end', () => {
    logger.warn('Redis: Connection ended');
  });

  return client;
};

declare global {
  // eslint-disable-next-line no-var
  var __redis: Redis | undefined;
}

export const redisClient: Redis = globalThis.__redis ?? createRedisClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__redis = redisClient;
}

export default redisClient;
