import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import {
  verifyMember, createClaim, listClaims, getClaim, updateClaim, scrubClaim,
  submitBatch, getBatchStatus, generateVfdReceipt, getAnalytics,
} from './nhif.controller';

const router = Router();

router.use(authenticate);

// Member verification
router.post('/verify', verifyMember);

// Claims
router.post('/claims', authorize(['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER']), createClaim);
router.get('/claims', listClaims);
router.get('/claims/:id', getClaim);
router.put('/claims/:id', authorize(['OWNER', 'PHARMACIST_IN_CHARGE']), updateClaim);
router.post('/claims/:id/scrub', authorize(['OWNER', 'PHARMACIST_IN_CHARGE']), scrubClaim);

// Batches
router.post('/batches', authorize(['OWNER', 'PHARMACIST_IN_CHARGE']), submitBatch);
router.get('/batches/:ref/status', getBatchStatus);

// VFD
router.post('/vfd/receipt', authorize(['OWNER', 'PHARMACIST_IN_CHARGE', 'DISPENSER']), generateVfdReceipt);

// Analytics
router.get('/analytics/success-rate', getAnalytics);

export default router;
