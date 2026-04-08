import { Request, Response } from 'express';
import { ComplianceStatus, ComplianceType } from '@prisma/client';
import ComplianceService from './compliance.service';
import { logger } from '../../lib/logger';

const service = new ComplianceService();

// ─── Items ─────────────────────────────────────────────────────────────────

export const listItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = req.user!.pharmacyId!;
    const filters = {
      status: req.query.status ? (String(req.query.status) as ComplianceStatus) : undefined,
      type: req.query.type ? (String(req.query.type) as ComplianceType) : undefined,
    };
    const data = await service.listItems(pharmacyId, filters);
    res.json({ success: true, data });
  } catch (err) {
    logger.error('listItems error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch compliance items' });
  }
};

export const createItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = req.user!.pharmacyId!;
    const { type, name, issuingBody, licenceNumber, issueDate, expiryDate, notes, assignedStaffId } = req.body;

    if (!type || !name || !issuingBody || !expiryDate) {
      res.status(400).json({
        success: false,
        error: 'type, name, issuingBody, and expiryDate are required',
      });
      return;
    }

    const item = await service.createItem(pharmacyId, {
      type: type as ComplianceType,
      name,
      issuingBody,
      licenceNumber: licenceNumber || undefined,
      issueDate: issueDate ? new Date(issueDate) : undefined,
      expiryDate: new Date(expiryDate),
      notes: notes || undefined,
      assignedStaffId: assignedStaffId || undefined,
    });

    res.status(201).json({ success: true, data: item });
  } catch (err) {
    logger.error('createItem error:', err);
    res.status(400).json({ success: false, error: String(err) });
  }
};

export const getItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = req.user!.pharmacyId!;
    const { id } = req.params;
    const item = await service.getItem(id, pharmacyId);
    if (!item) { res.status(404).json({ success: false, error: 'Compliance item not found' }); return; }
    res.json({ success: true, data: { ...item, status: service.computeStatus(item.expiryDate) } });
  } catch (err) {
    logger.error('getItem error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch compliance item' });
  }
};

export const updateItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = req.user!.pharmacyId!;
    const { id } = req.params;
    const item = await service.updateItem(id, pharmacyId, req.body);
    res.json({ success: true, data: item });
  } catch (err) {
    logger.error('updateItem error:', err);
    res.status(400).json({ success: false, error: String(err) });
  }
};

// ─── Documents ─────────────────────────────────────────────────────────────

export const getItemDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const docs = await service.getItemDocuments(id);
    res.json({ success: true, data: docs });
  } catch (err) {
    logger.error('getItemDocuments error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch documents' });
  }
};

export const uploadDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }

    const doc = await service.uploadDocument(id, {
      filename: req.file.originalname,
      path: req.file.path || `uploads/${req.file.originalname}`,
      size: req.file.size,
    });

    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    logger.error('uploadDocument error:', err);
    res.status(400).json({ success: false, error: String(err) });
  }
};

export const serveDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, docId } = req.params;
    const doc = await service.serveDocument(id, docId);
    res.json({ success: true, data: doc });
  } catch (err) {
    logger.error('serveDocument error:', err);
    res.status(404).json({ success: false, error: 'Document not found' });
  }
};

// ─── Health Score ──────────────────────────────────────────────────────────

export const getHealthScore = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = req.user!.pharmacyId!;
    const data = await service.calculateHealthScore(pharmacyId);
    res.json({ success: true, data });
  } catch (err) {
    logger.error('getHealthScore error:', err);
    res.status(500).json({ success: false, error: 'Failed to calculate health score' });
  }
};

// ─── Staff Credentials ─────────────────────────────────────────────────────

export const listStaffCredentials = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = req.user!.pharmacyId!;
    const data = await service.listStaffCredentials(pharmacyId);
    res.json({ success: true, data });
  } catch (err) {
    logger.error('listStaffCredentials error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch staff credentials' });
  }
};

export const createStaffCredential = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = req.user!.pharmacyId!;
    const { userId, credentialType, registrationNumber, expiryDate } = req.body;

    if (!userId || !credentialType || !registrationNumber || !expiryDate) {
      res.status(400).json({
        success: false,
        error: 'userId, credentialType, registrationNumber, and expiryDate are required',
      });
      return;
    }

    const cred = await service.createStaffCredential(pharmacyId, {
      userId,
      credentialType,
      registrationNumber,
      expiryDate: new Date(expiryDate),
    });

    res.status(201).json({ success: true, data: cred });
  } catch (err) {
    logger.error('createStaffCredential error:', err);
    res.status(400).json({ success: false, error: String(err) });
  }
};

// ─── Inspection Checklist ──────────────────────────────────────────────────

export const generateInspectionChecklist = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = req.user!.pharmacyId!;
    const userId = req.user!.id;
    const checklist = await service.generateInspectionChecklist(pharmacyId, userId);
    res.status(201).json({ success: true, data: checklist });
  } catch (err) {
    logger.error('generateInspectionChecklist error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate checklist' });
  }
};

export const getInspectionChecklist = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const checklist = await service.getInspectionChecklist(id);
    res.json({ success: true, data: checklist });
  } catch (err) {
    logger.error('getInspectionChecklist error:', err);
    res.status(404).json({ success: false, error: 'Checklist not found' });
  }
};

export const listInspectionChecklists = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = req.user!.pharmacyId!;
    const checklists = await service.listInspectionChecklists(pharmacyId);
    res.json({ success: true, data: checklists });
  } catch (err) {
    logger.error('listInspectionChecklists error:', err);
    res.status(500).json({ success: false, error: 'Failed to list checklists' });
  }
};

export const updateChecklistItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { itemIndex, status, notes } = req.body;
    if (itemIndex === undefined || !status) {
      res.status(400).json({ success: false, error: 'itemIndex and status are required' });
      return;
    }
    const checklist = await service.updateChecklistItem(id, itemIndex, status, notes);
    res.json({ success: true, data: checklist });
  } catch (err) {
    logger.error('updateChecklistItem error:', err);
    res.status(400).json({ success: false, error: String(err) });
  }
};
