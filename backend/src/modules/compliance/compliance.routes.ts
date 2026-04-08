import { Router } from 'express';
import { UserRole } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import {
  listItems,
  getItem,
  createItem,
  updateItem,
  getItemDocuments,
  uploadDocument,
  serveDocument,
  getHealthScore,
  listStaffCredentials,
  createStaffCredential,
  generateInspectionChecklist,
  getInspectionChecklist,
  updateChecklistItem,
  listInspectionChecklists,
} from './compliance.controller';

const router = Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/compliance',
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

const writeRoles = [
  UserRole.PHARMACIST_IN_CHARGE,
  UserRole.OWNER,
  UserRole.SUPER_ADMIN,
];

router.use(authenticate);

// ─── Compliance Items ──────────────────────────────────────────────────────
router.get('/items', listItems);
router.post('/items', authorize(writeRoles), createItem);
router.get('/items/:id', getItem);
router.put('/items/:id', authorize(writeRoles), updateItem);

// ─── Documents ─────────────────────────────────────────────────────────────
router.get('/items/:id/documents', getItemDocuments);
router.post('/items/:id/documents', authorize(writeRoles), upload.single('document'), uploadDocument);
router.get('/items/:id/documents/:docId', serveDocument);

// ─── Health Score ──────────────────────────────────────────────────────────
router.get('/health-score', getHealthScore);

// ─── Staff Credentials ─────────────────────────────────────────────────────
router.get('/staff-credentials', listStaffCredentials);
router.post('/staff-credentials', authorize(writeRoles), createStaffCredential);

// ─── Inspection Checklist ──────────────────────────────────────────────────
router.get('/inspection-checklists', listInspectionChecklists);
router.post('/inspection-checklists', authorize(writeRoles), generateInspectionChecklist);
router.get('/inspection-checklists/:id', getInspectionChecklist);
router.put('/inspection-checklists/:id/items', authorize(writeRoles), updateChecklistItem);

export default router;
