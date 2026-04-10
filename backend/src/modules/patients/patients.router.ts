import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import type { AuthRequest } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import type { Prisma } from '@prisma/client';

export const patientsRouter = Router();
patientsRouter.use(authenticate);

const pid = (req: AuthRequest) => req.user!.pharmacyId!;

patientsRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { search, page = '1', limit = '50' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: Prisma.PatientWhereInput = {
      pharmacyId: pid(req),
      ...(search ? {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName:  { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { nhifNumber: { contains: search } },
        ],
      } : {}),
    };

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({ where, skip, take: parseInt(limit), orderBy: { lastName: 'asc' } }),
      prisma.patient.count({ where }),
    ]);
    res.json({ data: patients, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) { next(e); }
});

patientsRouter.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const patient = await prisma.patient.findFirst({
      where: { id: req.params.id, pharmacyId: pid(req) },
      include: {
        dispensings: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { items: { include: { product: true } } },
        },
      },
    });
    if (!patient) { res.status(404).json({ error: 'Patient not found' }); return; }
    res.json({ data: patient });
  } catch (e) { next(e); }
});

patientsRouter.post('/', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      dateOfBirth: z.string().optional(),
      gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
      phone: z.string().optional(),
      nhifNumber: z.string().optional(),
      allergies: z.array(z.string()).optional(),
      chronicConditions: z.array(z.string()).optional(),
      notes: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const patient = await prisma.patient.create({
      data: {
        ...data,
        pharmacyId: pid(req),
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      },
    });
    res.status(201).json({ data: patient });
  } catch (e) { next(e); }
});

patientsRouter.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const exists = await prisma.patient.findFirst({
      where: { id: req.params.id, pharmacyId: pid(req) },
    });
    if (!exists) { res.status(404).json({ error: 'Patient not found' }); return; }
    const { dateOfBirth, ...rest } = req.body;
    const patient = await prisma.patient.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(dateOfBirth ? { dateOfBirth: new Date(dateOfBirth) } : {}),
      },
    });
    res.json({ data: patient });
  } catch (e) { next(e); }
});

// ── Dispensing ────────────────────────────────────────────────────────────────

patientsRouter.post('/dispense', async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      patientId: z.string().optional(),
      paymentMethod: z.enum(['CASH', 'MPESA', 'TIGOPESA', 'AIRTEL_MONEY', 'HALOPESA', 'INSURANCE']),
      notes: z.string().optional(),
      items: z.array(z.object({
        productId: z.string(),
        batchId: z.string().optional(),
        quantity: z.number().int().positive(),
        unitPrice: z.number().positive(),
        dose: z.string().optional(),
        icdCode: z.string().optional(),
        icdDescription: z.string().optional(),
        counsellingNotes: z.string().optional(),
      })).min(1),
    });
    const data = schema.parse(req.body);

    const totalAmount = data.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const referenceNumber = `RX-${Date.now().toString(36).toUpperCase()}`;

    const dispensing = await prisma.$transaction(async (tx) => {
      // Decrement batch quantities
      for (const item of data.items) {
        if (item.batchId) {
          await tx.batch.update({
            where: { id: item.batchId },
            data: { quantityRemaining: { decrement: item.quantity } },
          });
        }
        await tx.stockMovement.create({
          data: {
            pharmacyId: pid(req),
            productId: item.productId,
            batchId: item.batchId,
            userId: req.user!.userId,
            type: 'DISPENSED',
            quantity: item.quantity,
          },
        });
      }

      return tx.dispensing.create({
        data: {
          pharmacyId: pid(req),
          patientId: data.patientId,
          dispensedById: req.user!.userId,
          referenceNumber,
          paymentMethod: data.paymentMethod,
          totalAmount,
          notes: data.notes,
          items: {
            create: data.items.map(i => ({
              productId: i.productId,
              batchId: i.batchId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              lineTotal: i.quantity * i.unitPrice,
              dose: i.dose,
              icdCode: i.icdCode,
              icdDescription: i.icdDescription,
              counsellingNotes: i.counsellingNotes,
            })),
          },
        },
        include: {
          items: { include: { product: true } },
          patient: true,
          dispensedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    });

    res.status(201).json({ data: dispensing });
  } catch (e) { next(e); }
});
