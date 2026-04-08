"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateChecklistItem = exports.listInspectionChecklists = exports.getInspectionChecklist = exports.generateInspectionChecklist = exports.createStaffCredential = exports.listStaffCredentials = exports.getHealthScore = exports.serveDocument = exports.uploadDocument = exports.getItemDocuments = exports.updateItem = exports.getItem = exports.createItem = exports.listItems = void 0;
const compliance_service_1 = __importDefault(require("./compliance.service"));
const logger_1 = require("../../lib/logger");
const service = new compliance_service_1.default();
// ─── Items ─────────────────────────────────────────────────────────────────
const listItems = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        const filters = {
            status: req.query.status ? String(req.query.status) : undefined,
            type: req.query.type ? String(req.query.type) : undefined,
        };
        const data = await service.listItems(pharmacyId, filters);
        res.json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('listItems error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch compliance items' });
    }
};
exports.listItems = listItems;
const createItem = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        const { type, name, issuingBody, licenceNumber, issueDate, expiryDate, notes, assignedStaffId } = req.body;
        if (!type || !name || !issuingBody || !expiryDate) {
            res.status(400).json({
                success: false,
                error: 'type, name, issuingBody, and expiryDate are required',
            });
            return;
        }
        const item = await service.createItem(pharmacyId, {
            type: type,
            name,
            issuingBody,
            licenceNumber: licenceNumber || undefined,
            issueDate: issueDate ? new Date(issueDate) : undefined,
            expiryDate: new Date(expiryDate),
            notes: notes || undefined,
            assignedStaffId: assignedStaffId || undefined,
        });
        res.status(201).json({ success: true, data: item });
    }
    catch (err) {
        logger_1.logger.error('createItem error:', err);
        res.status(400).json({ success: false, error: String(err) });
    }
};
exports.createItem = createItem;
const getItem = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        const { id } = req.params;
        const item = await service.getItem(id, pharmacyId);
        if (!item) {
            res.status(404).json({ success: false, error: 'Compliance item not found' });
            return;
        }
        res.json({ success: true, data: { ...item, status: service.computeStatus(item.expiryDate) } });
    }
    catch (err) {
        logger_1.logger.error('getItem error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch compliance item' });
    }
};
exports.getItem = getItem;
const updateItem = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        const { id } = req.params;
        const item = await service.updateItem(id, pharmacyId, req.body);
        res.json({ success: true, data: item });
    }
    catch (err) {
        logger_1.logger.error('updateItem error:', err);
        res.status(400).json({ success: false, error: String(err) });
    }
};
exports.updateItem = updateItem;
// ─── Documents ─────────────────────────────────────────────────────────────
const getItemDocuments = async (req, res) => {
    try {
        const { id } = req.params;
        const docs = await service.getItemDocuments(id);
        res.json({ success: true, data: docs });
    }
    catch (err) {
        logger_1.logger.error('getItemDocuments error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch documents' });
    }
};
exports.getItemDocuments = getItemDocuments;
const uploadDocument = async (req, res) => {
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
    }
    catch (err) {
        logger_1.logger.error('uploadDocument error:', err);
        res.status(400).json({ success: false, error: String(err) });
    }
};
exports.uploadDocument = uploadDocument;
const serveDocument = async (req, res) => {
    try {
        const { id, docId } = req.params;
        const doc = await service.serveDocument(id, docId);
        res.json({ success: true, data: doc });
    }
    catch (err) {
        logger_1.logger.error('serveDocument error:', err);
        res.status(404).json({ success: false, error: 'Document not found' });
    }
};
exports.serveDocument = serveDocument;
// ─── Health Score ──────────────────────────────────────────────────────────
const getHealthScore = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        const data = await service.calculateHealthScore(pharmacyId);
        res.json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('getHealthScore error:', err);
        res.status(500).json({ success: false, error: 'Failed to calculate health score' });
    }
};
exports.getHealthScore = getHealthScore;
// ─── Staff Credentials ─────────────────────────────────────────────────────
const listStaffCredentials = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        const data = await service.listStaffCredentials(pharmacyId);
        res.json({ success: true, data });
    }
    catch (err) {
        logger_1.logger.error('listStaffCredentials error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch staff credentials' });
    }
};
exports.listStaffCredentials = listStaffCredentials;
const createStaffCredential = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
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
    }
    catch (err) {
        logger_1.logger.error('createStaffCredential error:', err);
        res.status(400).json({ success: false, error: String(err) });
    }
};
exports.createStaffCredential = createStaffCredential;
// ─── Inspection Checklist ──────────────────────────────────────────────────
const generateInspectionChecklist = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        const userId = req.user.id;
        const checklist = await service.generateInspectionChecklist(pharmacyId, userId);
        res.status(201).json({ success: true, data: checklist });
    }
    catch (err) {
        logger_1.logger.error('generateInspectionChecklist error:', err);
        res.status(500).json({ success: false, error: 'Failed to generate checklist' });
    }
};
exports.generateInspectionChecklist = generateInspectionChecklist;
const getInspectionChecklist = async (req, res) => {
    try {
        const { id } = req.params;
        const checklist = await service.getInspectionChecklist(id);
        res.json({ success: true, data: checklist });
    }
    catch (err) {
        logger_1.logger.error('getInspectionChecklist error:', err);
        res.status(404).json({ success: false, error: 'Checklist not found' });
    }
};
exports.getInspectionChecklist = getInspectionChecklist;
const listInspectionChecklists = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        const checklists = await service.listInspectionChecklists(pharmacyId);
        res.json({ success: true, data: checklists });
    }
    catch (err) {
        logger_1.logger.error('listInspectionChecklists error:', err);
        res.status(500).json({ success: false, error: 'Failed to list checklists' });
    }
};
exports.listInspectionChecklists = listInspectionChecklists;
const updateChecklistItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { itemIndex, status, notes } = req.body;
        if (itemIndex === undefined || !status) {
            res.status(400).json({ success: false, error: 'itemIndex and status are required' });
            return;
        }
        const checklist = await service.updateChecklistItem(id, itemIndex, status, notes);
        res.json({ success: true, data: checklist });
    }
    catch (err) {
        logger_1.logger.error('updateChecklistItem error:', err);
        res.status(400).json({ success: false, error: String(err) });
    }
};
exports.updateChecklistItem = updateChecklistItem;
//# sourceMappingURL=compliance.controller.js.map