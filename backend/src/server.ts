import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { apiRateLimiter } from './middleware/rateLimiter';
import { auditLog } from './middleware/auditLog';
import { logger } from './lib/logger';
import authRoutes from './modules/auth/auth.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import complianceRoutes from './modules/compliance/compliance.routes';
import patientRoutes from './modules/patients/patients.routes';
import nhifRoutes from './modules/nhif/nhif.routes';
import cpdRoutes from './modules/cpd/cpd.routes';
import knowledgeRoutes from './modules/knowledge/knowledge.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import { initJobs } from './jobs';

const app = express();

// ─── Trust Proxy ──────────────────────────────────────────────────────────────
// Required for express-rate-limit to work correctly behind a reverse proxy
app.set('trust proxy', 1);

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, Postman, curl)
      if (!origin) return callback(null, true);
      // In development allow any localhost origin regardless of port
      if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost')) {
        return callback(null, true);
      }
      const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
      if (origin === allowedOrigin) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  })
);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Static File Serving (uploaded documents) ─────────────────────────────────
app.use('/uploads', express.static('uploads'));

// ─── Global Rate Limiter ──────────────────────────────────────────────────────
app.use('/api/', apiRateLimiter);

// ─── Audit Logging Middleware ─────────────────────────────────────────────────
app.use('/api/', auditLog);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    service: 'pharmaconnect-backend',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/knowledge', knowledgeRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/compliance', complianceRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/nhif', nhifRoutes);
app.use('/api/v1/cpd', cpdRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// Waitlist signup (public)
app.post('/api/v1/waitlist', async (req: Request, res: Response) => {
  try {
    const { email, module: mod, phase } = req.body;
    if (!email || !mod || !phase) { res.status(400).json({ success: false, error: 'email, module, phase required' }); return; }
    const { prisma } = await import('./lib/prisma');
    const signup = await (prisma as any).waitlistSignup.create({ data: { email, module: mod, phase: parseInt(phase) } });
    res.status(201).json({ success: true, data: signup });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'The requested endpoint does not exist.',
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  const isDev = process.env.NODE_ENV === 'development';

  logger.error(`Unhandled error on ${req.method} ${req.path}: ${err.message}`, {
    stack: err.stack,
    ip: req.ip,
  });

  if (err.message.includes('CORS')) {
    res.status(403).json({
      success: false,
      error: 'CORS policy violation.',
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: 'An unexpected internal server error occurred.',
    ...(isDev && { details: err.message, stack: err.stack }),
  });
});

// ─── Server Startup ───────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '5174', 10);

const startServer = async (): Promise<void> => {
  try {
    const server = app.listen(PORT, () => {
      logger.info(
        `PharmaConnect API server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`
      );
    });

    // Initialize scheduled jobs
    if (process.env.NODE_ENV !== 'test') {
      initJobs();
    }

    // Graceful shutdown
    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`${signal} received. Shutting down gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          const { prisma } = await import('./lib/prisma');
          await prisma.$disconnect();
          logger.info('Prisma disconnected');
        } catch (err) {
          logger.error('Error disconnecting Prisma:', err);
        }

        try {
          const { redisClient } = await import('./lib/redis');
          await redisClient.quit();
          logger.info('Redis disconnected');
        } catch (err) {
          logger.error('Error disconnecting Redis:', err);
        }

        logger.info('Shutdown complete');
        process.exit(0);
      });

      // Force shutdown after 30s
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception:', err);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Rejection:', reason);
      process.exit(1);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

// Only start the server when this file is run directly (not when imported for testing)
if (require.main === module) {
  startServer();
}

export { app };
export default app;
