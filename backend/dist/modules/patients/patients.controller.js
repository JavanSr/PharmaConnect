"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCommonIcd10 = exports.searchIcd10 = exports.checkInteraction = exports.voidDispensingEvent = exports.dispenseWalkIn = exports.createDispensingEvent = exports.getPatientHistory = exports.updatePatientFlags = exports.getPatient = exports.createPatient = void 0;
const client_1 = require("@prisma/client");
const patients_service_1 = __importDefault(require("./patients.service"));
const logger_1 = require("../../lib/logger");
const service = new patients_service_1.default();
const createPatient = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        const { chronicConditions, allergyFlags, activeMedications, optInMethod } = req.body;
        const patient = await service.createPatient(pharmacyId, {
            chronicConditions,
            allergyFlags,
            activeMedications,
            optInMethod,
        });
        res.status(201).json({ success: true, data: patient });
    }
    catch (err) {
        logger_1.logger.error('createPatient error:', err);
        res.status(400).json({ success: false, error: String(err) });
    }
};
exports.createPatient = createPatient;
const getPatient = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        const { id } = req.params;
        const patient = await service.getPatient(id, pharmacyId);
        res.json({ success: true, data: patient });
    }
    catch (err) {
        logger_1.logger.error('getPatient error:', err);
        res.status(404).json({ success: false, error: 'Patient not found' });
    }
};
exports.getPatient = getPatient;
const updatePatientFlags = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        const { id } = req.params;
        const { allergyFlags, chronicConditions, activeMedications } = req.body;
        const patient = await service.updatePatientFlags(id, pharmacyId, {
            allergyFlags,
            chronicConditions,
            activeMedications,
        });
        res.json({ success: true, data: patient });
    }
    catch (err) {
        logger_1.logger.error('updatePatientFlags error:', err);
        res.status(400).json({ success: false, error: String(err) });
    }
};
exports.updatePatientFlags = updatePatientFlags;
const getPatientHistory = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        const { id } = req.params;
        const limit = parseInt(String(req.query.limit || '50'), 10);
        const history = await service.getPatientHistory(id, pharmacyId, limit);
        res.json({ success: true, data: history });
    }
    catch (err) {
        logger_1.logger.error('getPatientHistory error:', err);
        res.status(404).json({ success: false, error: String(err) });
    }
};
exports.getPatientHistory = getPatientHistory;
const createDispensingEvent = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        const { id: patientId } = req.params;
        const { drugId, batchId, quantity, dose, icdCode, counsellingNotes, paymentMethod, paymentRef } = req.body;
        if (!drugId || quantity === undefined) {
            res.status(400).json({ success: false, error: 'drugId and quantity are required' });
            return;
        }
        if (paymentMethod &&
            !Object.values(client_1.PaymentMethod).includes(String(paymentMethod))) {
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
            dispensedByUserId: req.user.id,
            paymentMethod: paymentMethod ? String(paymentMethod) : undefined,
            paymentRef: paymentRef || undefined,
        });
        res.status(201).json({ success: true, data: event });
    }
    catch (err) {
        logger_1.logger.error('createDispensingEvent error:', err);
        const e = err;
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
exports.createDispensingEvent = createDispensingEvent;
const dispenseWalkIn = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        const userId = req.user.id;
        const { productId, quantity, dose, icdCode, counsellingNotes, dispensedByUserId, paymentMethod, paymentRef, items, } = req.body;
        const method = paymentMethod ? String(paymentMethod) : 'CASH';
        if (!Object.values(client_1.PaymentMethod).includes(method)) {
            res.status(400).json({ success: false, error: 'Invalid payment method' });
            return;
        }
        if (Array.isArray(items)) {
            if (items.length === 0) {
                res.status(400).json({ success: false, error: 'At least one cart item is required' });
                return;
            }
            const result = await service.dispenseWalkInCart(pharmacyId, {
                items: items.map((item) => ({
                    productId: String(item.productId || ''),
                    quantity: parseInt(String(item.quantity), 10),
                    dose: item.dose ? String(item.dose) : undefined,
                    icdCode: item.icdCode ? String(item.icdCode) : undefined,
                    counsellingNotes: item.counsellingNotes || item.notes
                        ? String(item.counsellingNotes || item.notes)
                        : undefined,
                })),
                dispensedByUserId: dispensedByUserId ? String(dispensedByUserId) : userId,
                paymentMethod: method,
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
            paymentMethod: method,
            paymentRef: paymentRef || undefined,
        });
        res.status(201).json({ success: true, data: result });
    }
    catch (err) {
        logger_1.logger.error('dispenseWalkIn error:', err);
        res.status(400).json({ success: false, error: String(err) });
    }
};
exports.dispenseWalkIn = dispenseWalkIn;
const voidDispensingEvent = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        const { id: patientId, eventId } = req.params;
        const { voidReason } = req.body;
        if (!voidReason) {
            res.status(400).json({ success: false, error: 'voidReason is required' });
            return;
        }
        const event = await service.voidDispensingEvent(eventId, patientId, pharmacyId, {
            voidReason,
            voidedByUserId: req.user.id,
        });
        res.json({ success: true, data: event });
    }
    catch (err) {
        logger_1.logger.error('voidDispensingEvent error:', err);
        res.status(400).json({ success: false, error: String(err) });
    }
};
exports.voidDispensingEvent = voidDispensingEvent;
const checkInteraction = async (req, res) => {
    try {
        const { patientId, newDrugId } = req.query;
        const pharmacyId = req.user.pharmacyId;
        if (!patientId || !newDrugId) {
            res.status(400).json({ success: false, error: 'patientId and newDrugId are required' });
            return;
        }
        const result = await service.checkDrugInteractions(String(patientId), String(newDrugId), pharmacyId);
        res.json({ success: true, data: result });
    }
    catch (err) {
        logger_1.logger.error('checkInteraction error:', err);
        res.status(500).json({ success: false, error: 'Interaction check failed' });
    }
};
exports.checkInteraction = checkInteraction;
const searchIcd10 = async (req, res) => {
    try {
        const q = String(req.query.q || '');
        if (!q) {
            res.status(400).json({ success: false, error: 'q query parameter is required' });
            return;
        }
        const limit = parseInt(String(req.query.limit || '20'), 10);
        const results = await service.searchIcd10(q, limit);
        res.json({ success: true, data: results });
    }
    catch (err) {
        logger_1.logger.error('searchIcd10 error:', err);
        res.status(500).json({ success: false, error: 'ICD-10 search failed' });
    }
};
exports.searchIcd10 = searchIcd10;
const getCommonIcd10 = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        const limit = parseInt(String(req.query.limit || '20'), 10);
        const results = await service.getCommonIcd10(pharmacyId, limit);
        res.json({ success: true, data: results });
    }
    catch (err) {
        logger_1.logger.error('getCommonIcd10 error:', err);
        res.status(500).json({ success: false, error: 'Failed to get common ICD-10 codes' });
    }
};
exports.getCommonIcd10 = getCommonIcd10;
//# sourceMappingURL=patients.controller.js.map