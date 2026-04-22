import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'node:path';

import { errorHandler, notFound } from './middleware/errorHandler';
import { authRouter } from './modules/auth/auth.router';
import { meRouter } from './modules/me/me.router';
import { inventoryRouter } from './modules/inventory/inventory.router';
import { complianceRouter } from './modules/compliance/compliance.router';
import { patientsRouter } from './modules/patients/patients.router';
import { nhifRouter } from './modules/nhif/nhif.router';
import { cpdRouter } from './modules/cpd/cpd.router';
import { knowledgeRouter } from './modules/knowledge/knowledge.router';
import { analyticsRouter } from './modules/analytics/analytics.router';
import { settingsRouter } from './modules/settings/settings.router';
import { notificationsRouter } from './modules/notifications/notifications.router';
import { patientSafetyRouter } from './modules/patient-safety/patient-safety.router';
import { dispensingRouter } from './modules/dispensing/dispensing.router';
import { waitlistRouter } from './modules/waitlist/waitlist.router';
import { b2bRouter } from './modules/b2b/b2b.router';
import { reportsRouter } from './modules/reports/reports.router';
import { attendanceRouter } from './modules/reports/attendance.router';
import { registerExpiryAlertsJob } from './jobs/expiry-alerts';
import { registerLowStockAlertsJob } from './jobs/low-stock-alerts';
import { registerComplianceAlertsJob, registerComplianceHealthJob } from './jobs/compliance-alerts';
import { registerTrialAlertsJob } from './jobs/trial-alerts';
import { registerWeeklyDigestJob } from './jobs/weekly-digest';
import { registerVfdRetryJob } from './jobs/vfd-retry';
import { registerPredictionsJob } from './jobs/predictions';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// ── Security & middleware ─────────────────────────────────────────────────────
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(','),
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? './uploads')));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// ── Rate limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
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

// ── Routes ────────────────────────────────────────────────────────────────────
const v1 = '/api/v1';
app.use(`${v1}/auth`,       authRouter);
app.use(`${v1}/me`,         meRouter);
app.use(`${v1}/waitlist`,   waitlistRouter);
app.use(`${v1}/inventory`,  inventoryRouter);
app.use(`${v1}/compliance`, complianceRouter);
app.use(`${v1}/patients`,   patientsRouter);
app.use(`${v1}/nhif`,       nhifRouter);
app.use(`${v1}/cpd`,        cpdRouter);
app.use(`${v1}/knowledge`,  knowledgeRouter);
app.use(`${v1}/analytics`,  analyticsRouter);
app.use(`${v1}/settings`,   settingsRouter);
app.use(`${v1}/notifications`, notificationsRouter);
app.use(`${v1}/patient-safety`, patientSafetyRouter);
app.use(`${v1}/dispensing`, dispensingRouter);
app.use(`${v1}/b2b`, b2bRouter);
app.use(`${v1}/reports`, reportsRouter);
app.use(`${v1}/attendance`, attendanceRouter);

// ── Error handling ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  registerExpiryAlertsJob();
  registerLowStockAlertsJob();
  registerComplianceAlertsJob();
  registerComplianceHealthJob();
  registerTrialAlertsJob();
  registerWeeklyDigestJob();
  registerVfdRetryJob();
  registerPredictionsJob();
  app.listen(PORT, () => {
    console.log(`PharmaConnect API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });
}

export default app;
