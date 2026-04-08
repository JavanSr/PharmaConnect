import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { listActivities, logActivity, getSummary, getRequirement, uploadEvidence } from './cpd.controller';

const router = Router();
const upload = multer({ dest: path.join(process.cwd(), 'uploads', 'cpd') });

router.use(authenticate);
router.use(authorize(['PHARMACIST_IN_CHARGE', 'DISPENSER', 'WHOLESALE_SELLER', 'SUPER_ADMIN']));

router.get('/activities', listActivities);
router.post('/activities', logActivity);
router.get('/summary', getSummary);
router.get('/requirement', getRequirement);
router.post('/activities/:id/evidence', upload.single('file'), uploadEvidence);

export default router;
