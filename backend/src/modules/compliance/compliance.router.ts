import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { authenticate, type AuthRequest } from '../../middleware/auth';
import { requirePermission } from '../../middleware/permissions';
import { enforceTrialRestrictions } from '../../middleware/trial';
import {
  createComplianceItem,
  createStaffCredential,
  deleteComplianceItem,
  deleteStaffCredential,
  ensureChecklistTemplatesSeeded,
  generateInspectionChecklist,
  getComplianceHealthScore,
  getComplianceItemById,
  getInspectionChecklist,
  listComplianceDocuments,
  listComplianceItems,
  listInspectionChecklists,
  listStaffCredentials,
  updateComplianceItem,
  updateInspectionChecklistItem,
  updateStaffCredential,
  uploadComplianceDocument,
} from './compliance.service';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (Number(process.env.MAX_FILE_SIZE_MB ?? '5') || 5) * 1024 * 1024,
  },
});

const complianceItemSchema = z.object({
  type: z.string().min(1),
  name: z.string().min(1),
  issuingBody: z.string().min(1),
  licenceNumber: z.string().optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().min(1),
  notes: z.string().optional(),
  description: z.string().optional(),
});

const complianceItemUpdateSchema = complianceItemSchema.partial().extend({
  isNotApplicable: z.boolean().optional(),
});

const staffCredentialSchema = z.object({
  userId: z.string().optional(),
  credentialName: z.string().min(1),
  credentialNumber: z.string().optional(),
  issuingBody: z.string().optional(),
  issuedAt: z.string().optional(),
  expiresAt: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

const inspectionUpdateSchema = z.object({
  itemIndex: z.number().int().nonnegative(),
  status: z.enum(['PENDING', 'COMPLIANT', 'NON_COMPLIANT', 'NOT_APPLICABLE']),
  notes: z.string().optional(),
});

const listQuerySchema = z.object({
  status: z.enum(['GREEN', 'AMBER', 'RED', 'EXPIRED']).optional(),
});

function pharmacyId(req: AuthRequest): string {
  return req.user!.pharmacyId!;
}

function complianceRole(req: AuthRequest) {
  return req.user!.role;
}

function handleComplianceError(res: any, error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  if (error.message === 'WHOLESALE_PERMIT_ACCESS_DENIED') {
    res.status(403).json({ error: 'WHOLESALE_PERMIT_ACCESS_DENIED' });
    return true;
  }

  if (error.message === 'WHOLESALE_SCOPE_REQUIRED') {
    res.status(403).json({ error: 'WHOLESALE_SCOPE_REQUIRED' });
    return true;
  }

  if (error.message === 'CHECKLIST_ITEM_NOT_FOUND') {
    res.status(404).json({ error: 'CHECKLIST_ITEM_NOT_FOUND' });
    return true;
  }

  return false;
}

export const complianceRouter = Router();
complianceRouter.use(authenticate);
complianceRouter.use(enforceTrialRestrictions);

complianceRouter.get('/', requirePermission('compliance.view'), async (req: AuthRequest, res, next) => {
  try {
    const { status } = listQuerySchema.parse(req.query);
    const items = await listComplianceItems({
      pharmacyId: pharmacyId(req),
      role: complianceRole(req),
      status,
    });
    res.json({ data: items });
  } catch (error) {
    next(error);
  }
});

complianceRouter.get('/items', requirePermission('compliance.view'), async (req: AuthRequest, res, next) => {
  try {
    const { status } = listQuerySchema.parse(req.query);
    const items = await listComplianceItems({
      pharmacyId: pharmacyId(req),
      role: complianceRole(req),
      status,
    });
    res.json({ data: items });
  } catch (error) {
    next(error);
  }
});

complianceRouter.get('/health-score', requirePermission('compliance.view'), async (req: AuthRequest, res, next) => {
  try {
    const data = await getComplianceHealthScore({
      pharmacyId: pharmacyId(req),
      role: complianceRole(req),
    });
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

complianceRouter.get('/items/:id', requirePermission('compliance.view'), async (req: AuthRequest, res, next) => {
  try {
    const item = await getComplianceItemById({
      itemId: req.params.id,
      pharmacyId: pharmacyId(req),
      role: complianceRole(req),
    });

    if (!item) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    res.json({ data: item });
  } catch (error) {
    next(error);
  }
});

complianceRouter.post('/items', requirePermission('compliance.manage'), async (req: AuthRequest, res, next) => {
  try {
    const item = await createComplianceItem({
      pharmacyId: pharmacyId(req),
      role: complianceRole(req),
      payload: complianceItemSchema.parse(req.body),
    });
    res.status(201).json({ data: item });
  } catch (error) {
    if (!handleComplianceError(res, error)) {
      next(error);
    }
  }
});

complianceRouter.put('/items/:id', requirePermission('compliance.manage'), async (req: AuthRequest, res, next) => {
  try {
    const item = await updateComplianceItem({
      itemId: req.params.id,
      pharmacyId: pharmacyId(req),
      role: complianceRole(req),
      payload: complianceItemUpdateSchema.parse(req.body),
    });

    if (!item) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    res.json({ data: item });
  } catch (error) {
    if (!handleComplianceError(res, error)) {
      next(error);
    }
  }
});

complianceRouter.delete('/items/:id', requirePermission('compliance.manage'), async (req: AuthRequest, res, next) => {
  try {
    const deleted = await deleteComplianceItem({
      itemId: req.params.id,
      pharmacyId: pharmacyId(req),
      role: complianceRole(req),
    });

    if (!deleted) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    res.json({ data: { message: 'Deleted' } });
  } catch (error) {
    next(error);
  }
});

complianceRouter.get('/items/:id/documents', requirePermission('compliance.view'), async (req: AuthRequest, res, next) => {
  try {
    const documents = await listComplianceDocuments({
      itemId: req.params.id,
      pharmacyId: pharmacyId(req),
      role: complianceRole(req),
    });

    if (!documents) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    res.json({ data: documents });
  } catch (error) {
    next(error);
  }
});

complianceRouter.post(
  '/items/:id/documents',
  requirePermission('compliance.manage'),
  upload.single('document'),
  async (req: AuthRequest, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'DOCUMENT_REQUIRED' });
        return;
      }

      const document = await uploadComplianceDocument({
        itemId: req.params.id,
        pharmacyId: pharmacyId(req),
        role: complianceRole(req),
        uploadedBy: req.user!.userId,
        file: req.file,
      });

      if (!document) {
        res.status(404).json({ error: 'Not found' });
        return;
      }

      res.status(201).json({ data: document });
    } catch (error) {
      next(error);
    }
  },
);

complianceRouter.get('/staff-credentials', requirePermission('compliance.view'), async (req: AuthRequest, res, next) => {
  try {
    const data = await listStaffCredentials(pharmacyId(req));
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

complianceRouter.post('/staff-credentials', requirePermission('compliance.manage'), async (req: AuthRequest, res, next) => {
  try {
    const data = await createStaffCredential({
      pharmacyId: pharmacyId(req),
      payload: staffCredentialSchema.parse(req.body),
    });
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
});

complianceRouter.put('/staff-credentials/:id', requirePermission('compliance.manage'), async (req: AuthRequest, res, next) => {
  try {
    const data = await updateStaffCredential({
      credentialId: req.params.id,
      pharmacyId: pharmacyId(req),
      payload: staffCredentialSchema.partial().parse(req.body),
    });

    if (!data) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    res.json({ data });
  } catch (error) {
    next(error);
  }
});

complianceRouter.delete('/staff-credentials/:id', requirePermission('compliance.manage'), async (req: AuthRequest, res, next) => {
  try {
    const deleted = await deleteStaffCredential({
      credentialId: req.params.id,
      pharmacyId: pharmacyId(req),
    });

    if (!deleted) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    res.json({ data: { message: 'Deleted' } });
  } catch (error) {
    next(error);
  }
});

complianceRouter.get('/inspection-checklists', requirePermission('compliance.view'), async (req: AuthRequest, res, next) => {
  try {
    await ensureChecklistTemplatesSeeded();
    const data = await listInspectionChecklists(pharmacyId(req));
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

complianceRouter.get('/inspection-checklists/:id', requirePermission('compliance.view'), async (req: AuthRequest, res, next) => {
  try {
    const data = await getInspectionChecklist({
      checklistId: req.params.id,
      pharmacyId: pharmacyId(req),
    });

    if (!data) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    res.json({ data });
  } catch (error) {
    next(error);
  }
});

complianceRouter.post('/inspection-checklists', requirePermission('compliance.manage'), async (req: AuthRequest, res, next) => {
  try {
    await ensureChecklistTemplatesSeeded();
    const data = await generateInspectionChecklist({
      pharmacyId: pharmacyId(req),
      generatedBy: req.user!.userId,
    });
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
});

complianceRouter.put('/inspection-checklists/:id/items', requirePermission('compliance.manage'), async (req: AuthRequest, res, next) => {
  try {
    const payload = inspectionUpdateSchema.parse(req.body);
    const data = await updateInspectionChecklistItem({
      checklistId: req.params.id,
      pharmacyId: pharmacyId(req),
      itemIndex: payload.itemIndex,
      status: payload.status,
      notes: payload.notes,
    });

    if (!data) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    res.json({ data });
  } catch (error) {
    if (!handleComplianceError(res, error)) {
      next(error);
    }
  }
});
