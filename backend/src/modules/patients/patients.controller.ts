import { Request, Response } from 'express';
import { PaymentMethod } from '@prisma/client';
import PatientService from './patients.service';
import { logger } from '../../lib/logger';

const service = new PatientService();

export const createPatient = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = req.user!.pharmacyId!;
    const { chronicConditions, allergyFlags, activeMedications, optInMethod } = req.body;
    const patient = await service.createPatient(pharmacyId, {
      chronicConditions,
      allergyFlags,
      activeMedications,
      optInMethod,
    });
    res.status(201).json({ success: true, data: patient });
  } catch (err) {
    logger.error('createPatient error:', err);
    res.status(400).json({ success: false, error: String(err) });
  }
};

export const getPatient = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = req.user!.pharmacyId!;
    const { id } = req.params;
    const patient = await service.getPatient(id, pharmacyId);
    res.json({ success: true, data: patient });
  } catch (err) {
    logger.error('getPatient error:', err);
    res.status(404).json({ success: false, error: 'Patient not found' });
  }
};

export const updatePatientFlags = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = req.user!.pharmacyId!;
    const { id } = req.params;
    const { allergyFlags, chronicConditions, activeMedications } = req.body;
    const patient = await service.updatePatientFlags(id, pharmacyId, {
      allergyFlags,
      chronicConditions,
      activeMedications,
    });
    res.json({ success: true, data: patient });
  } catch (err) {
    logger.error('updatePatientFlags error:', err);
    res.status(400).json({ success: false, error: String(err) });
  }
};

export const getPatientHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = req.user!.pharmacyId!;
    const { id } = req.params;
    const limit = parseInt(String(req.query.limit || '50'), 10);
    const history = await service.getPatientHistory(id, pharmacyId, limit);
    res.json({ success: true, data: history });
  } catch (err) {
    logger.error('getPatientHistory error:', err);
    res.status(404).json({ success: false, error: String(err) });
  }
};

export const createDispensingEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = req.user!.pharmacyId!;
    const { id: patientId } = req.params;
    const { drugId, batchId, quantity, dose, icdCode, counsellingNotes, paymentMethod, paymentRef } = req.body;

    if (!drugId || quantity === undefined) {
      res.status(400).json({ success: false, error: 'drugId and quantity are required' });
      return;
    }

    if (
      paymentMethod &&
      !Object.values(PaymentMethod).includes(String(paymentMethod) as PaymentMethod)
    ) {
      res.status(400).json({ success: false, error: 'Invalid payment method' });
      return;
    }

    const event = await service.createDispensingEvent(patientId, pharmacyId, {
      drugId,
      batchId: batchId || undefined,
      quantity: parseInt(quantity, 10),
      dose: dose || undefined,
      icdCode: icdCode || undefined,
      counsellingNotes: counsellingNotes || undefined,
      dispensedByUserId: req.user!.id,
      paymentMethod: paymentMethod ? (String(paymentMethod) as PaymentMethod) : undefined,
      paymentRef: paymentRef || undefined,
    });

    res.status(201).json({ success: true, data: event });
  } catch (err: unknown) {
    logger.error('createDispensingEvent error:', err);
    const e = err as { code?: string; interactions?: unknown; severity?: string; message?: string };
    if (e.code === 'DRUG_INTERACTION') {
      res.status(422).json({
        success: false,
        error: e.message,
        code: 'DRUG_INTERACTION',
        severity: e.severity,
        interactions: e.interactions,
      });
      return;
    }
    res.status(400).json({ success: false, error: String(err) });
  }
};

export const dispenseWalkIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = req.user!.pharmacyId!;
    const userId = req.user!.id;
    const {
      productId,
      quantity,
      dose,
      icdCode,
      counsellingNotes,
      dispensedByUserId,
      paymentMethod,
      paymentRef,
      items,
    } = req.body;

    const method = paymentMethod ? String(paymentMethod) : 'CASH';
    if (!Object.values(PaymentMethod).includes(method as PaymentMethod)) {
      res.status(400).json({ success: false, error: 'Invalid payment method' });
      return;
    }

    if (Array.isArray(items)) {
      if (items.length === 0) {
        res.status(400).json({ success: false, error: 'At least one cart item is required' });
        return;
      }

      const result = await service.dispenseWalkInCart(pharmacyId, {
        items: items.map((item: Record<string, unknown>) => ({
          productId: String(item.productId || ''),
          quantity: parseInt(String(item.quantity), 10),
          dose: item.dose ? String(item.dose) : undefined,
          icdCode: item.icdCode ? String(item.icdCode) : undefined,
          counsellingNotes: item.counsellingNotes || item.notes
            ? String(item.counsellingNotes || item.notes)
            : undefined,
        })),
        dispensedByUserId: dispensedByUserId ? String(dispensedByUserId) : userId,
        paymentMethod: method as PaymentMethod,
        paymentRef: paymentRef ? String(paymentRef) : undefined,
      });

      res.status(201).json({ success: true, data: result });
      return;
    }

    if (!productId || quantity === undefined) {
      res.status(400).json({ success: false, error: 'productId and quantity are required' });
      return;
    }

    const result = await service.dispenseWalkIn(pharmacyId, {
      productId: String(productId),
      quantity: parseInt(String(quantity), 10),
      dose: dose || undefined,
      icdCode: icdCode || undefined,
      counsellingNotes: counsellingNotes || undefined,
      dispensedByUserId: dispensedByUserId || userId,
      paymentMethod: method as PaymentMethod,
      paymentRef: paymentRef || undefined,
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    logger.error('dispenseWalkIn error:', err);
    res.status(400).json({ success: false, error: String(err) });
  }
};

export const voidDispensingEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = req.user!.pharmacyId!;
    const { id: patientId, eventId } = req.params;
    const { voidReason } = req.body;

    if (!voidReason) {
      res.status(400).json({ success: false, error: 'voidReason is required' });
      return;
    }

    const event = await service.voidDispensingEvent(eventId, patientId, pharmacyId, {
      voidReason,
      voidedByUserId: req.user!.id,
    });

    res.json({ success: true, data: event });
  } catch (err) {
    logger.error('voidDispensingEvent error:', err);
    res.status(400).json({ success: false, error: String(err) });
  }
};

export const checkInteraction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId, newDrugId } = req.query;
    const pharmacyId = req.user!.pharmacyId!;

    if (!patientId || !newDrugId) {
      res.status(400).json({ success: false, error: 'patientId and newDrugId are required' });
      return;
    }

    const result = await service.checkDrugInteractions(
      String(patientId),
      String(newDrugId),
      pharmacyId
    );

    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('checkInteraction error:', err);
    res.status(500).json({ success: false, error: 'Interaction check failed' });
  }
};

export const searchIcd10 = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = String(req.query.q || '');
    if (!q) {
      res.status(400).json({ success: false, error: 'q query parameter is required' });
      return;
    }
    const limit = parseInt(String(req.query.limit || '20'), 10);
    const results = await service.searchIcd10(q, limit);
    res.json({ success: true, data: results });
  } catch (err) {
    logger.error('searchIcd10 error:', err);
    res.status(500).json({ success: false, error: 'ICD-10 search failed' });
  }
};

export const getCommonIcd10 = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacyId = req.user!.pharmacyId!;
    const limit = parseInt(String(req.query.limit || '20'), 10);
    const results = await service.getCommonIcd10(pharmacyId, limit);
    res.json({ success: true, data: results });
  } catch (err) {
    logger.error('getCommonIcd10 error:', err);
    res.status(500).json({ success: false, error: 'Failed to get common ICD-10 codes' });
  }
};
