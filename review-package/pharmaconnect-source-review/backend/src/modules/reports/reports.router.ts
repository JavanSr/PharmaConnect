import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, type AuthRequest } from '../../middleware/auth';
import { requirePermission } from '../../middleware/permissions';
import { enforceTrialRestrictions } from '../../middleware/trial';
import {
  getInventoryReports,
  getPeerBenchmark,
  getRevenueReport,
  renderReportPdf,
  runCustomBuilder,
  streamCsv,
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
    next(error);
  }
});
