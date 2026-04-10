import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import type { AuthRequest } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import type { Prisma } from '@prisma/client';

export const nhifRouter = Router();
nhifRouter.use(authenticate);

const pid = (req: AuthRequest) => req.user!.pharmacyId!;

nhifRouter.get('/claims', async (req: AuthRequest, res, next) => {
  try {
    const { status, page = '1', limit = '50' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: Prisma.NhifClaimWhereInput = {
      pharmacyId: pid(req),
      ...(status ? { status: status as any } : {}),
    };
    const [claims, total] = await Promise.all([
      prisma.nhifClaim.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      prisma.nhifClaim.count({ where }),
    ]);
    res.json({ data: claims, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) { next(e); }
});

nhifRouter.get('/claims/:id', async (req: AuthRequest, res, next) => {
  try {
    const claim = await prisma.nhifClaim.findFirst({
      where: { id: req.params.id, pharmacyId: pid(req) },
      include: { items: true, patient: true },
    });
    if (!claim) { res.status(404).json({ error: 'Claim not found' }); return; }
    res.json({ data: claim });
  } catch (e) { next(e); }
});

nhifRouter.post('/claims', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      patientId: z.string().optional(),
      patientNhifNumber: z.string().min(1),
      patientName: z.string().min(1),
      serviceDate: z.string(),
      items: z.array(z.object({
        description: z.string(),
        quantity: z.number().int().positive(),
        unitCost: z.number().positive(),
        icdCode: z.string().optional(),
      })).min(1),
    });
    const data = schema.parse(req.body);
    const totalAmount = data.items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
    const claimNumber = `NHIF-${Date.now().toString(36).toUpperCase()}`;

    const claim = await prisma.nhifClaim.create({
      data: {
        pharmacyId: pid(req),
        patientId: data.patientId,
        claimNumber,
        patientNhifNumber: data.patientNhifNumber,
        patientName: data.patientName,
        serviceDate: new Date(data.serviceDate),
        totalAmount,
        items: {
          create: data.items.map(i => ({
            description: i.description,
            quantity: i.quantity,
            unitCost: i.unitCost,
            totalCost: i.quantity * i.unitCost,
            icdCode: i.icdCode,
          })),
        },
      },
      include: { items: true },
    });
    res.status(201).json({ data: claim });
  } catch (e) { next(e); }
});

nhifRouter.patch('/claims/:id/submit', async (req: AuthRequest, res, next) => {
  try {
    const claim = await prisma.nhifClaim.findFirst({
      where: { id: req.params.id, pharmacyId: pid(req) },
    });
    if (!claim) { res.status(404).json({ error: 'Claim not found' }); return; }
    if (claim.status !== 'DRAFT') {
      res.status(400).json({ error: 'Only DRAFT claims can be submitted' });
      return;
    }
    const updated = await prisma.nhifClaim.update({
      where: { id: req.params.id },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
    });
    res.json({ data: updated });
  } catch (e) { next(e); }
});

nhifRouter.get('/stats', async (req: AuthRequest, res, next) => {
  try {
    const claims = await prisma.nhifClaim.findMany({ where: { pharmacyId: pid(req) } });
    const stats = {
      total: claims.length,
      draft: claims.filter(c => c.status === 'DRAFT').length,
      submitted: claims.filter(c => c.status === 'SUBMITTED').length,
      approved: claims.filter(c => c.status === 'APPROVED').length,
      rejected: claims.filter(c => c.status === 'REJECTED').length,
      paid: claims.filter(c => c.status === 'PAID').length,
      totalValue: claims.reduce((s, c) => s + Number(c.totalAmount), 0),
    };
    res.json({ data: stats });
  } catch (e) { next(e); }
});
