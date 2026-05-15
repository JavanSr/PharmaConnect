import { type NextFunction, type Response, Router } from 'express';
import { authenticate, requireRole, type AuthRequest } from '../../middleware/auth';
import { enforceTrialRestrictions } from '../../middleware/trial';
import { getStaffActivityReport } from './reports.service';

export const staffActivityRouter = Router();
staffActivityRouter.use(authenticate);
staffActivityRouter.use(enforceTrialRestrictions);

function pid(req: AuthRequest): string {
  const p = req.user?.pharmacyId;
  if (!p) throw Object.assign(new Error('Pharmacy context required'), { status: 400 });
  return p;
}

async function sendStaffActivityReport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ data: await getStaffActivityReport(pid(req)) });
  } catch (error) {
    next(error);
  }
}

staffActivityRouter.get('/', requireRole('PHARMACIST_IN_CHARGE', 'OWNER'), sendStaffActivityReport);
