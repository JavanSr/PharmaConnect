import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import type { AuthRequest } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import type { Prisma } from '@prisma/client';

export const complianceRouter = Router();
complianceRouter.use(authenticate);

const pid = (req: AuthRequest) => req.user!.pharmacyId!;

complianceRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { category, status } = z.object({
      category: z.string().optional(),
      status: z.string().optional(),
    }).parse(req.query);

    const where: Prisma.ComplianceItemWhereInput = {
      pharmacyId: pid(req),
      ...(category ? { category: category as any } : {}),
      ...(status   ? { status:   status   as any } : {}),
    };

    const items = await prisma.complianceItem.findMany({
      where,
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });
    res.json({ data: items });
  } catch (e) { next(e); }
});

complianceRouter.get('/items', async (req: AuthRequest, res, next) => {
  try {
    const items = await prisma.complianceItem.findMany({
      where: { pharmacyId: pid(req) },
      orderBy: { dueDate: 'asc' },
    });
    res.json({ data: items });
  } catch (e) { next(e); }
});

complianceRouter.get('/items/:id', async (req: AuthRequest, res, next) => {
  try {
    const item = await prisma.complianceItem.findFirst({
      where: { id: req.params.id, pharmacyId: pid(req) },
    });
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ data: item });
  } catch (e) { next(e); }
});

complianceRouter.post('/items', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      title: z.string().min(1),
      category: z.string().optional(),
      description: z.string().optional(),
      dueDate: z.string().optional(),
      renewalDate: z.string().optional(),
      documentRef: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const item = await prisma.complianceItem.create({
      data: {
        pharmacyId: pid(req),
        title: data.title,
        category: (data.category as any) || 'OTHER',
        description: data.description,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        renewalDate: data.renewalDate ? new Date(data.renewalDate) : undefined,
        documentRef: data.documentRef,
      },
    });
    res.status(201).json({ data: item });
  } catch (e) { next(e); }
});

complianceRouter.put('/items/:id', async (req: AuthRequest, res, next) => {
  try {
    const exists = await prisma.complianceItem.findFirst({
      where: { id: req.params.id, pharmacyId: pid(req) },
    });
    if (!exists) { res.status(404).json({ error: 'Not found' }); return; }

    const { dueDate, renewalDate, isNotApplicable, ...rest } = req.body;
    const item = await prisma.complianceItem.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(dueDate    ? { dueDate:    new Date(dueDate)    } : {}),
        ...(renewalDate ? { renewalDate: new Date(renewalDate) } : {}),
        ...(isNotApplicable !== undefined ? { isNotApplicable, status: isNotApplicable ? 'NOT_APPLICABLE' : 'COMPLIANT' } : {}),
        updatedAt: new Date(),
      },
    });
    res.json({ data: item });
  } catch (e) { next(e); }
});

complianceRouter.delete('/items/:id', async (req: AuthRequest, res, next) => {
  try {
    const exists = await prisma.complianceItem.findFirst({
      where: { id: req.params.id, pharmacyId: pid(req) },
    });
    if (!exists) { res.status(404).json({ error: 'Not found' }); return; }
    await prisma.complianceItem.delete({ where: { id: req.params.id } });
    res.json({ data: { message: 'Deleted' } });
  } catch (e) { next(e); }
});

complianceRouter.get('/stats', async (req: AuthRequest, res, next) => {
  try {
    const items = await prisma.complianceItem.findMany({
      where: { pharmacyId: pid(req) },
    });
    const stats = {
      total: items.length,
      compliant: items.filter(i => i.status === 'COMPLIANT').length,
      dueSoon: items.filter(i => i.status === 'DUE_SOON').length,
      overdue: items.filter(i => i.status === 'OVERDUE').length,
      notApplicable: items.filter(i => i.isNotApplicable).length,
    };
    res.json({ data: stats });
  } catch (e) { next(e); }
});
