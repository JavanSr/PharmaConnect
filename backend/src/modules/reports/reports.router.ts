import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, type AuthRequest } from '../../middleware/auth';
import { requirePermission } from '../../middleware/permissions';
import { enforceTrialRestrictions } from '../../middleware/trial';
import { getSafetyImpactReport } from '../patient-safety/patient-safety.service';
import {
  getInventoryReports,
  getPeerBenchmark,
  getRevenueReport,
  renderReportPdf,
  runCustomBuilder,
  streamCsv,
  getDispensingReport,
  getStockMovementReport,
  getExpiryByThresholdReport,
  getVoidsAndReturnsReport,
  getPaymentBreakdownReport,
  getSalesReport,
  getProfitReport,
} from './reports.service';

function ensureFinancialReportAccess(req: AuthRequest) {
  if (req.user!.normalizedRole === 'WHOLESALE_COUNTER_STAFF') {
    throw Object.assign(new Error('ROLE_INSUFFICIENT'), { status: 403, code: 'ROLE_INSUFFICIENT' });
  }
}

export const reportsRouter = Router();
reportsRouter.use(authenticate);
reportsRouter.use(enforceTrialRestrictions);

function pid(req: AuthRequest): string {
  const p = req.user?.pharmacyId;
  if (!p) throw Object.assign(new Error('Pharmacy context required'), { status: 400 });
  return p;
}

reportsRouter.get('/inventory', requirePermission('inventory.view_reports'), async (req: AuthRequest, res, next) => {
  try {
    const { format } = z.object({ format: z.enum(['json', 'csv']).optional() }).parse(req.query);
    const data = await getInventoryReports(pid(req));
    const rows = data.onHand.map((item) => ({
      productName: item.name,
      currentStock: item.currentStock ?? 0,
      reorderLevel: item.reorderLevel,
      nextExpiry: item.nextExpiringBatch?.expiryDate?.toISOString?.() ?? null,
    }));

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="inventory-report.csv"');
      streamCsv(rows).pipe(res);
      return;
    }

    res.json({ data });
  } catch (error) {
    next(error);
  }
});

reportsRouter.get('/financial/revenue', requireRole('OWNER', 'PHARMACIST_IN_CHARGE', 'WHOLESALE_MANAGER', 'SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    ensureFinancialReportAccess(req);
    const { format, from, to } = z.object({
      format: z.enum(['json', 'csv', 'pdf']).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }).parse(req.query);

    const data = await getRevenueReport(pid(req), from, to);
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="revenue-report.csv"');
      streamCsv(data.lines).pipe(res);
      return;
    }

    if (format === 'pdf') {
      const pdf = await renderReportPdf('Revenue Report', data.lines);
      res.setHeader('Content-Type', 'application/pdf');
      res.send(pdf);
      return;
    }

    res.json({ data });
  } catch (error) {
    next(error);
  }
});

reportsRouter.get('/benchmarking/peer', requireRole('OWNER', 'PHARMACIST_IN_CHARGE', 'WHOLESALE_MANAGER', 'SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    ensureFinancialReportAccess(req);
    res.json({ data: await getPeerBenchmark(pid(req)) });
  } catch (error) {
    next(error);
  }
});

reportsRouter.get('/safety-impact', requireRole('OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const { scope, from, to } = z.object({
      scope: z.enum(['pharmacy', 'office']).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }).parse(req.query);
    const officeScope = scope === 'office';

    if (officeScope && req.user!.normalizedRole !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'OFFICE_SCOPE_REQUIRES_SUPER_ADMIN' });
      return;
    }

    res.json({
      data: await getSafetyImpactReport({
        pharmacyId: officeScope ? undefined : pid(req),
        officeScope,
        from,
        to,
      }),
    });
  } catch (error) {
    next(error);
  }
});


// ── Dispensing report ─────────────────────────────────────────────────────────
reportsRouter.get('/dispensing', requireRole('OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const { format, from, to } = z.object({ format: z.enum(['json','csv','pdf']).optional(), from: z.string().optional(), to: z.string().optional() }).parse(req.query);
    const data = await getDispensingReport(pid(req), from, to);
    if (format === 'csv') { res.setHeader('Content-Type','text/csv'); res.setHeader('Content-Disposition','attachment; filename="dispensing-report.csv"'); streamCsv(data.lines).pipe(res); return; }
    if (format === 'pdf') { const pdf = await renderReportPdf('Dispensing Report', data.lines); res.setHeader('Content-Type','application/pdf'); res.send(pdf); return; }
    res.json({ data });
  } catch (error) { next(error); }
});

// ── Stock movement report ─────────────────────────────────────────────────────
reportsRouter.get('/stock-movement', requireRole('OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const { format, from, to } = z.object({ format: z.enum(['json','csv','pdf']).optional(), from: z.string().optional(), to: z.string().optional() }).parse(req.query);
    const data = await getStockMovementReport(pid(req), from, to);
    if (format === 'csv') { res.setHeader('Content-Type','text/csv'); res.setHeader('Content-Disposition','attachment; filename="stock-movement.csv"'); streamCsv(data.lines).pipe(res); return; }
    if (format === 'pdf') { const pdf = await renderReportPdf('Stock Movement', data.lines); res.setHeader('Content-Type','application/pdf'); res.send(pdf); return; }
    res.json({ data });
  } catch (error) { next(error); }
});

// ── Expiry by threshold report ────────────────────────────────────────────────
reportsRouter.get('/expiry', requirePermission('inventory.view_reports'), async (req: AuthRequest, res, next) => {
  try {
    const { format, threshold } = z.object({ format: z.enum(['json','csv','pdf']).optional(), threshold: z.coerce.number().optional() }).parse(req.query);
    const data = await getExpiryByThresholdReport(pid(req), threshold ?? 90);
    if (format === 'csv') { res.setHeader('Content-Type','text/csv'); res.setHeader('Content-Disposition','attachment; filename="expiry-report.csv"'); streamCsv(data.batches).pipe(res); return; }
    if (format === 'pdf') { const pdf = await renderReportPdf('Expiry Report', data.batches); res.setHeader('Content-Type','application/pdf'); res.send(pdf); return; }
    res.json({ data });
  } catch (error) { next(error); }
});

// ── Voids and returns report ──────────────────────────────────────────────────
reportsRouter.get('/voids-returns', requireRole('OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const { format, from, to } = z.object({ format: z.enum(['json','csv','pdf']).optional(), from: z.string().optional(), to: z.string().optional() }).parse(req.query);
    const data = await getVoidsAndReturnsReport(pid(req), from, to);
    if (format === 'csv') { res.setHeader('Content-Type','text/csv'); res.setHeader('Content-Disposition','attachment; filename="voids-returns.csv"'); streamCsv(data.lines).pipe(res); return; }
    if (format === 'pdf') { const pdf = await renderReportPdf('Voids & Returns', data.lines); res.setHeader('Content-Type','application/pdf'); res.send(pdf); return; }
    res.json({ data });
  } catch (error) { next(error); }
});

// ── Payment breakdown ─────────────────────────────────────────────────────────
reportsRouter.get('/payment-breakdown', requireRole('OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const { from, to } = z.object({ from: z.string().optional(), to: z.string().optional() }).parse(req.query);
    res.json({ data: await getPaymentBreakdownReport(pid(req), from, to) });
  } catch (error) { next(error); }
});

// ── Sales Report ─────────────────────────────────────────────────────────────
// Roles: OWNER, PHARMACIST_IN_CHARGE. All retail tiers.
reportsRouter.get('/sales', requireRole('OWNER', 'PHARMACIST_IN_CHARGE', 'SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const { from, to, groupBy } = z.object({
      from:    z.string().optional(),
      to:      z.string().optional(),
      groupBy: z.enum(['day', 'week', 'month']).optional(),
    }).parse(req.query);
    res.json({ data: await getSalesReport(pid(req), from, to, groupBy ?? 'day') });
  } catch (error) { next(error); }
});

// ── Profit & Margin Report ────────────────────────────────────────────────────
// Roles: OWNER only. Tiers: STANDARD, PREMIUM, ENTERPRISE.
// STANDARD gets summary + time-series only. PREMIUM+ also gets per-product tables.
reportsRouter.get('/profit', requireRole('OWNER', 'SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const tier = req.user?.pharmacy?.subscriptionTier as string | undefined;
    const isSuperAdmin = req.user!.normalizedRole === 'SUPER_ADMIN';
    const ALLOWED_TIERS = ['STANDARD', 'PREMIUM', 'ENTERPRISE'];
    if (!isSuperAdmin && (!tier || !ALLOWED_TIERS.includes(tier))) {
      res.status(403).json({ error: 'Forbidden: Profit report requires STANDARD tier or above.' });
      return;
    }

    const { from, to } = z.object({
      from: z.string().optional(),
      to:   z.string().optional(),
    }).parse(req.query);

    const report = await getProfitReport(pid(req), from, to);

    // STANDARD tier: strip per-product tables (PREMIUM+ only)
    const isPerProductTier = isSuperAdmin || tier === 'PREMIUM' || tier === 'ENTERPRISE';
    if (!isPerProductTier) {
      res.json({
        data: {
          ...report,
          topProductsByProfit: null,
          bottomProductsByMargin: null,
          perProductLocked: true,
        },
      });
      return;
    }

    res.json({ data: report });
  } catch (error) { next(error); }
});

reportsRouter.post('/custom-builder', requireRole('OWNER', 'PHARMACIST_IN_CHARGE', 'WHOLESALE_MANAGER', 'SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    ensureFinancialReportAccess(req);
    const payload = z.object({
      dimension: z.string().min(1),
      metric: z.string().min(1),
    }).parse(req.body);

    const suspiciousPattern = /(drop\s+table|;|--|\bunion\b|\binsert\b|\bdelete\b|\bupdate\b)/i;
    if (suspiciousPattern.test(payload.dimension) || suspiciousPattern.test(payload.metric)) {
      res.status(400).json({ error: 'INVALID_REPORT_SELECTION' });
      return;
    }

    res.json({
      data: await runCustomBuilder(pid(req), payload.dimension as any, payload.metric as any),
    });
  } catch (error) {
    next(error)  }
});
;
