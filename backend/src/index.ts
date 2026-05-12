import 'dotenv/config';
import fs from 'fs';
import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'node:path';

import { errorHandler, notFound } from './middleware/errorHandler';
import { authenticate } from './middleware/auth';
import { authRouter } from './modules/auth/auth.router';
import { meRouter } from './modules/me/me.router';
import { inventoryRouter } from './modules/inventory/inventory.router';
import { stockOrderRouter } from './modules/inventory/stock-order.router';
import { complianceRouter } from './modules/compliance/compliance.router';
import { patientsRouter } from './modules/patients/patients.router';
import { nhifRouter } from './modules/nhif/nhif.router';
import { cpdRouter } from './modules/cpd/cpd.router';
import { knowledgeRouter } from './modules/knowledge/knowledge.router';
import { analyticsRouter } from './modules/analytics/analytics.router';
import { forecastingRouter } from './modules/forecasting/forecasting.router';
import { settingsRouter } from './modules/settings/settings.router';
import { notificationsRouter } from './modules/notifications/notifications.router';
import { patientSafetyRouter } from './modules/patient-safety/patient-safety.router';
import { dispensingRouter } from './modules/dispensing/dispensing.router';
import { waitlistRouter } from './modules/waitlist/waitlist.router';
import { b2bRouter } from './modules/b2b/b2b.router';
import { reportsRouter } from './modules/reports/reports.router';
import { attendanceRouter } from './modules/reports/attendance.router';
import { reviewRouter } from './modules/review/review.router';
import { founderRouter } from './modules/founder/founder.router';
import { catalogueImportRouter } from './modules/catalogue-import/catalogue-import.router';
import { sourceSyncRouter } from './modules/source-sync/source-sync.router';
import { registerExpiryAlertsJob } from './jobs/expiry-alerts';
import { registerLowStockAlertsJob } from './jobs/low-stock-alerts';
import { registerComplianceAlertsJob, registerComplianceHealthJob } from './jobs/compliance-alerts';
import { registerTrialAlertsJob } from './jobs/trial-alerts';
import { registerWeeklyDigestJob } from './jobs/weekly-digest';
import { registerVfdRetryJob } from './jobs/vfd-retry';
import { registerPredictionsJob } from './jobs/predictions';

if (!process.env.NODE_ENV) {
  console.warn('[startup] NODE_ENV not set - defaulting to development. Set NODE_ENV=production in production.');
  process.env.NODE_ENV = 'development';
}

const validEnvs = ['development', 'test', 'production'];
if (!validEnvs.includes(process.env.NODE_ENV)) {
  console.error(
    `[startup] Invalid NODE_ENV: "${process.env.NODE_ENV}". Must be one of: ${validEnvs.join(', ')}`
  );
  process.exit(1);
}

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

function configuredCorsOrigins(): string[] {
  const origins = new Set(
    [
      'https://pharma-connect-rouge.vercel.app',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      process.env.ALLOWED_ORIGINS || '',
    ]
      .join(',')
      .split(',')
      .map((origin) => origin.trim().replace(/\/$/, ''))
      .filter(Boolean),
  );

  if (process.env.FRONTEND_URL) {
    origins.add(process.env.FRONTEND_URL.trim().replace(/\/$/, ''));
  }

  return [...origins];
}

const corsOrigins = configuredCorsOrigins();
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || corsOrigins.includes(origin.replace(/\/$/, ''))) {
      callback(null, true);
      return;
    }

    console.warn('[cors.blockedOrigin]', { origin, allowedOrigins: corsOrigins });
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};

// ── Security & middleware ─────────────────────────────────────────────────────
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.get('/uploads/*', authenticate, (req: Request, res: Response) => {
  const uploadsRoot = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? './uploads');
  const requestedPath = path.normalize(req.params[0] ?? '').replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = path.resolve(uploadsRoot, requestedPath);
  if (!filePath.startsWith(`${uploadsRoot}${path.sep}`)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.sendFile(filePath);
});

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// ── Rate limiting ────────────────────────────────────────────────────────────
const slowRequestLogMs = Number(process.env.SLOW_REQUEST_LOG_MS ?? 1000);
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    if (durationMs >= slowRequestLogMs || req.originalUrl === '/api/v1/auth/login') {
      console.log('[http.timing]', {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs,
      });
    }
  });
  next();
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/v1/auth/', authLimiter);

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (_req, res) => {
  res.json({ service: 'APOTEKH API', status: 'ok' });
});

// ── Routes ────────────────────────────────────────────────────────────────────
const v1 = '/api/v1';
app.use(`${v1}/auth`,       authRouter);
app.use(`${v1}/me`,         meRouter);
app.use(`${v1}/waitlist`,   waitlistRouter);
app.use(`${v1}/inventory`,  inventoryRouter);
app.use(`${v1}/stock-orders`, authenticate, stockOrderRouter);
app.use(`${v1}/compliance`, complianceRouter);
app.use(`${v1}/patients`,   patientsRouter);
app.use(`${v1}/nhif`,       nhifRouter);
app.use(`${v1}/cpd`,        cpdRouter);
app.use(`${v1}/knowledge`,  knowledgeRouter);
app.use(`${v1}/analytics`,  analyticsRouter);
app.use(`${v1}/forecasting`, forecastingRouter);
app.use(`${v1}/settings`,   settingsRouter);
app.use(`${v1}/notifications`, notificationsRouter);
app.use(`${v1}/patient-safety`, patientSafetyRouter);
app.use(`${v1}/dispensing`, dispensingRouter);
app.use(`${v1}/b2b`, b2bRouter);
app.use(`${v1}/reports`, reportsRouter);
app.use(`${v1}/attendance`, attendanceRouter);
app.use(`${v1}/review-queue`, reviewRouter);
app.use(`${v1}/founder`,           founderRouter);
app.use(`${v1}/catalogue-import`,  catalogueImportRouter);
app.use(`${v1}/source-sync`,       sourceSyncRouter);

// ── Error handling ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});
process.on('uncaughtException', (error) => {
  console.error('[uncaughtException]', error);
});

if (process.env.NODE_ENV !== 'test') {
  registerExpiryAlertsJob();
  registerLowStockAlertsJob();
  registerComplianceAlertsJob();
  registerComplianceHealthJob();
  registerTrialAlertsJob();
  registerWeeklyDigestJob();
  registerVfdRetryJob();
  registerPredictionsJob();
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`APOTEKH API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    console.log('[startup.config]', {
      port: PORT,
      nodeEnv: process.env.NODE_ENV,
      frontendUrl: process.env.FRONTEND_URL ?? null,
      corsOrigins,
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      hasJwtAccessSecret: Boolean(process.env.JWT_SECRET || process.env.JWT_PRIVATE_KEY || process.env.JWT_ACCESS_SECRET),
      hasJwtRefreshSecret: Boolean(process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_PRIVATE_KEY),
    });
  });

  server.on('error', (error) => {
    console.error('[startup.listenFailed]', error);
    process.exit(1);
  });
}

export default app;
