import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { getSummary } from './analytics.controller';

const router = Router();

router.use(authenticate);
router.get('/summary', getSummary);

export default router;
