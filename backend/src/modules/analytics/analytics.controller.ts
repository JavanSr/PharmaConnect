import { Request, Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { logger } from '../../lib/logger';

const service = new AnalyticsService();

export const getSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = req.user?.pharmacyId;
    if (!pharmacyId) {
      res.status(400).json({
        success: false,
        error: 'Pharmacy context is required for analytics summary',
      });
      return;
    }

    const data = await service.getSummary(pharmacyId);
    res.json({ success: true, data });
  } catch (err) {
    logger.error('analytics getSummary error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to generate analytics summary',
    });
  }
};
