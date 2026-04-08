import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const createPrismaClient = (): PrismaClient => {
  return new PrismaClient({
    log: [
      {
        emit: 'event',
        level: 'query',
      },
      {
        emit: 'event',
        level: 'error',
      },
      {
        emit: 'event',
        level: 'warn',
      },
    ],
  });
};

// Singleton pattern to prevent multiple connections in development (hot reload)
const prisma = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

// Attach event listeners
(prisma as any).$on('query', (e: { query: string; duration: number }) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`Prisma Query: ${e.query} — ${e.duration}ms`);
  }
});

(prisma as any).$on('error', (e: { message: string }) => {
  logger.error(`Prisma Error: ${e.message}`);
});

(prisma as any).$on('warn', (e: { message: string }) => {
  logger.warn(`Prisma Warning: ${e.message}`);
});

export { prisma };
export default prisma;
