import { Request, Response } from 'express';
import { NhifClaimsService } from './nhif.service';
import { z } from 'zod';

const service = new NhifClaimsService();

const createClaimSchema = z.object({
  nhifCardNumber: z.string().min(1),
  memberName: z.string().optional(),
  memberStatus: z.string().optional(),
  scheme: z.string().optional(),
  icdCode: z.string().min(1),
  drugCode: z.string().optional(),
  quantity: z.number().int().positive(),
  claimedAmount: z.number().positive(),
  patientId: z.string().uuid(),
});

const submitBatchSchema = z.object({
  claimIds: z.array(z.string()).min(1),
});

export const verifyMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cardNumber } = req.body;
    if (!cardNumber) { res.status(400).json({ success: false, error: 'cardNumber is required' }); return; }
    const result = await service.verifyMember(cardNumber);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const createClaim = async (req: Request, res: Response): Promise<void> => {
  try {
    const { dispensingEventId } = req.params;
    const pharmacyId = (req as any).user.pharmacyId;
    const data = createClaimSchema.parse(req.body);
    const claim = await service.createClaim(dispensingEventId || req.body.dispensingEventId, pharmacyId, data);
    res.status(201).json({ success: true, data: claim });
  } catch (err: any) {
    if (err.name === 'ZodError') { res.status(400).json({ success: false, error: err.errors }); return; }
    res.status(500).json({ success: false, error: err.message });
  }
};

export const listClaims = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = (req as any).user.pharmacyId;
    const { status, dateFrom, dateTo, page = '1', limit = '20' } = req.query;
    const result = await service.listClaims(
      pharmacyId,
      { status: status as any, dateFrom: dateFrom ? new Date(dateFrom as string) : undefined, dateTo: dateTo ? new Date(dateTo as string) : undefined },
      { page: parseInt(page as string), limit: parseInt(limit as string) }
    );
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getClaim = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const pharmacyId = (req as any).user.pharmacyId;
    const claim = await service.getClaim(id, pharmacyId);
    if (!claim) { res.status(404).json({ success: false, error: 'Claim not found' }); return; }
    res.json({ success: true, data: claim });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateClaim = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const pharmacyId = (req as any).user.pharmacyId;
    const claim = await service.updateClaim(id, pharmacyId, req.body);
    res.json({ success: true, data: claim });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const scrubClaim = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await service.scrubClaim(id);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const submitBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = (req as any).user.pharmacyId;
    const { claimIds } = submitBatchSchema.parse(req.body);
    const batch = await service.submitBatch(pharmacyId, claimIds);
    res.status(201).json({ success: true, data: batch });
  } catch (err: any) {
    if (err.name === 'ZodError') { res.status(400).json({ success: false, error: err.errors }); return; }
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getBatchStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ref } = req.params;
    const status = await service.getBatchStatus(ref);
    res.json({ success: true, data: status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const generateVfdReceipt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { dispensingEventId } = req.body;
    if (!dispensingEventId) { res.status(400).json({ success: false, error: 'dispensingEventId required' }); return; }
    const result = await service.generateVfdReceipt(dispensingEventId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = (req as any).user.pharmacyId;
    const { dateFrom, dateTo } = req.query;
    const result = await service.getAnalytics(pharmacyId, {
      from: dateFrom ? new Date(dateFrom as string) : new Date(new Date().setDate(1)),
      to: dateTo ? new Date(dateTo as string) : new Date(),
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
