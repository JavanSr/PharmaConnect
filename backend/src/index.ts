import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { errorHandler, notFound } from './middleware/errorHandler.js';
import { authRouter } from './modules/auth/auth.router.js';
import { inventoryRouter } from './modules/inventory/inventory.router.js';
import { complianceRouter } from './modules/compliance/compliance.router.js';
import { patientsRouter } from './modules/patients/patients.router.js';
import { nhifRouter } from './modules/nhif/nhif.router.js';
import { cpdRouter } from './modules/cpd/cpd.router.js';
import { knowledgeRouter } from './modules/knowledge/knowledge.router.js';
import { analyticsRouter } from './modules/analytics/analytics.router.js';
import { settingsRouter } from './modules/settings/settings.router.js';

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
app.use(`${v1}/inventory`,  inventoryRouter);
app.use(`${v1}/compliance`, complianceRouter);
app.use(`${v1}/patients`,   patientsRouter);
app.use(`${v1}/nhif`,       nhifRouter);
app.use(`${v1}/cpd`,        cpdRouter);
app.use(`${v1}/knowledge`,  knowledgeRouter);
app.use(`${v1}/analytics`,  analyticsRouter);
app.use(`${v1}/settings`,   settingsRouter);

// ── Error handling ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`PharmaConnect API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

export default app;
