import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import {
  createPatient,
  getPatient,
  updatePatientFlags,
  getPatientHistory,
  createDispensingEvent,
  dispenseWalkIn,
  voidDispensingEvent,
  checkInteraction,
  searchIcd10,
  getCommonIcd10,
} from './patients.controller';

const router = Router();

const dispenserAndAbove = [
  UserRole.DISPENSER,
  UserRole.PHARMACIST_IN_CHARGE,
  UserRole.OWNER,
  UserRole.SUPER_ADMIN,
];

const picAndAbove = [
  UserRole.PHARMACIST_IN_CHARGE,
  UserRole.OWNER,
  UserRole.SUPER_ADMIN,
];

router.use(authenticate);

// ICD-10 (before /:id routes to avoid conflict)
router.get('/icd10/search', searchIcd10);
router.get('/icd10/common', getCommonIcd10);

// Interaction check
router.get('/check-interaction', authorize(dispenserAndAbove), checkInteraction);

// Walk-in dispensing
router.post('/dispense/walk-in', authorize(dispenserAndAbove), dispenseWalkIn);

// Patient CRUD
router.post('/', authorize(dispenserAndAbove), createPatient);
router.get('/:id', authorize(dispenserAndAbove), getPatient);
router.put('/:id/flags', authorize(dispenserAndAbove), updatePatientFlags);
router.get('/:id/history', authorize(dispenserAndAbove), getPatientHistory);

// Dispensing events
router.post('/:id/dispensing', authorize(dispenserAndAbove), createDispensingEvent);
router.post('/:id/dispensing/:eventId/void', authorize(picAndAbove), voidDispensingEvent);

export default router;
