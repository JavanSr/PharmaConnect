import { Router } from 'express';
import { authenticate, requireRole, type AuthRequest } from '../../middleware/auth';
import { enforceTrialRestrictions } from '../../middleware/trial';
import { listAttendanceForPharmacy, listAttendanceForUser } from './reports.service';

export const attendanceRouter = Router();
attendanceRouter.use(authenticate);
attendanceRouter.use(enforceTrialRestrictions);

attendanceRouter.get('/my-records', async (req: AuthRequest, res, next) => {
  try {
    res.json({ data: await listAttendanceForUser(req.user!.userId) });
  } catch (error) {
    next(error);
  }
});

attendanceRouter.get('/pharmacy-records', requireRole('PHARMACIST_IN_CHARGE', 'OWNER', 'SUPER_ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    res.json({ data: await listAttendanceForPharmacy(req.user!.pharmacyId!) });
  } catch (error) {
    next(error);
  }
});
