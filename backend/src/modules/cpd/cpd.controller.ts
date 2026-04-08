import { Request, Response } from 'express';
import { CpdService } from './cpd.service';
import { z } from 'zod';
import { CpdActivityType } from '@prisma/client';

const service = new CpdService();

const logActivitySchema = z.object({
  activityType: z.nativeEnum(CpdActivityType),
  title: z.string().min(1).max(255),
  activityDate: z.string().transform(s => new Date(s)),
  pointsClaimed: z.number().int().min(1).max(10),
  renewalYear: z.number().int().optional(),
  sourceArticleId: z.string().optional(),
});

export const listActivities = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { renewalYear } = req.query;
    const activities = await service.listActivities(userId, renewalYear ? parseInt(renewalYear as string) : undefined);
    res.json({ success: true, data: activities });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const logActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const data = logActivitySchema.parse(req.body);
    const activity = await service.logActivity(userId, data);
    res.status(201).json({ success: true, data: activity });
  } catch (err: any) {
    if (err.name === 'ZodError') { res.status(400).json({ success: false, error: err.errors }); return; }
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { renewalYear } = req.query;
    const summary = await service.getSummary(userId, renewalYear ? parseInt(renewalYear as string) : undefined);
    res.json({ success: true, data: summary });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getRequirement = async (req: Request, res: Response): Promise<void> => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const req_ = await service.getRequirement(year);
    res.json({ success: true, data: req_ });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const uploadEvidence = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const file = req.file;
    if (!file) { res.status(400).json({ success: false, error: 'File required' }); return; }
    const activity = await service.uploadEvidence(id, userId, { path: file.path, filename: file.originalname });
    res.json({ success: true, data: activity });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
