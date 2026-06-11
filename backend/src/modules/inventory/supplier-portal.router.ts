/**
 * Supplier Portal Router — PUBLIC routes (no authentication required)
 *
 * GET  /supplier-portal/:token          → render HTML page
 * POST /supplier-portal/:token/confirm  → supplier confirms order
 * POST /supplier-portal/:token/reject   → supplier rejects order
 *
 * These routes are intentionally outside /api/v1 so the URL is
 * clean and short enough to fit in a WhatsApp message.
 */

import { Router } from 'express';
import { z } from 'zod';
import * as svc from './supplier-portal.service';
import { renderPortalPage } from './supplier-portal.html';

export const supplierPortalRouter = Router();

// ── GET /supplier-portal/:token ────────────────────────────────────────────────

supplierPortalRouter.get('/:token', async (req, res, next) => {
  try {
    const data = await svc.getPortalByToken(req.params.token);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.send(renderPortalPage(data));
  } catch (e: any) {
    if (e.status === 404 || e.status === 410) {
      res.status(e.status).send(errorPage(e.message));
      return;
    }
    next(e);
  }
});

// ── POST /supplier-portal/:token/confirm ───────────────────────────────────────

const confirmSchema = z.object({
  supplierNotes: z.string().max(1000).optional(),
  deliveryDate: z.string().optional(),
  lineItems: z.array(
    z.object({
      lineItemId:        z.string().min(1),
      quantityConfirmed: z.coerce.number().int().min(0),
      unitPrice:         z.coerce.number().min(0),
      available:         z.boolean(),
      notes:             z.string().max(500).optional(),
    }),
  ).min(1),
});

supplierPortalRouter.post('/:token/confirm', async (req, res, next) => {
  try {
    const input = confirmSchema.parse(req.body);
    const result = await svc.confirmOrder(req.params.token, input);
    res.json({ data: result });
  } catch (e: any) {
    if (e.status) { res.status(e.status).json({ error: e.message }); return; }
    next(e);
  }
});

// ── POST /supplier-portal/:token/reject ────────────────────────────────────────

supplierPortalRouter.post('/:token/reject', async (req, res, next) => {
  try {
    const { reason } = z.object({ reason: z.string().max(500).optional() }).parse(req.body);
    const result = await svc.rejectOrder(req.params.token, reason);
    res.json({ data: result });
  } catch (e: any) {
    if (e.status) { res.status(e.status).json({ error: e.message }); return; }
    next(e);
  }
});

// ── Minimal error HTML ─────────────────────────────────────────────────────────

function errorPage(message: string): string {
  return `<!DOCTYPE html><html lang="en"><head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>APOTEKH</title>
    <style>body{font-family:sans-serif;background:#f4f8f6;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
    .box{background:white;border-radius:16px;padding:32px;max-width:400px;text-align:center;border:1px solid #d6f0e8}
    h1{color:#0d4035;font-size:18px;margin-bottom:8px}p{color:#516965;font-size:14px}
    a{color:#1a6b5c;font-weight:600}</style></head>
  <body><div class="box">
    <div style="font-size:28px;font-weight:800;color:#1a6b5c;margin-bottom:16px">APOTEKH</div>
    <h1>Order link unavailable</h1>
    <p>${message}</p>
    <p style="margin-top:16px"><a href="https://apotekh.co.tz">apotekh.co.tz</a></p>
  </div></body></html>`;
}
