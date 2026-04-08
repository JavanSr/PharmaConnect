"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnalytics = exports.generateVfdReceipt = exports.getBatchStatus = exports.submitBatch = exports.scrubClaim = exports.updateClaim = exports.getClaim = exports.listClaims = exports.createClaim = exports.verifyMember = void 0;
const nhif_service_1 = require("./nhif.service");
const zod_1 = require("zod");
const service = new nhif_service_1.NhifClaimsService();
const createClaimSchema = zod_1.z.object({
    nhifCardNumber: zod_1.z.string().min(1),
    memberName: zod_1.z.string().optional(),
    memberStatus: zod_1.z.string().optional(),
    scheme: zod_1.z.string().optional(),
    icdCode: zod_1.z.string().min(1),
    drugCode: zod_1.z.string().optional(),
    quantity: zod_1.z.number().int().positive(),
    claimedAmount: zod_1.z.number().positive(),
    patientId: zod_1.z.string().uuid(),
});
const submitBatchSchema = zod_1.z.object({
    claimIds: zod_1.z.array(zod_1.z.string()).min(1),
});
const verifyMember = async (req, res) => {
    try {
        const { cardNumber } = req.body;
        if (!cardNumber) {
            res.status(400).json({ success: false, error: 'cardNumber is required' });
            return;
        }
        const result = await service.verifyMember(cardNumber);
        res.json({ success: true, data: result });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.verifyMember = verifyMember;
const createClaim = async (req, res) => {
    try {
        const { dispensingEventId } = req.params;
        const pharmacyId = req.user.pharmacyId;
        const data = createClaimSchema.parse(req.body);
        const claim = await service.createClaim(dispensingEventId || req.body.dispensingEventId, pharmacyId, data);
        res.status(201).json({ success: true, data: claim });
    }
    catch (err) {
        if (err.name === 'ZodError') {
            res.status(400).json({ success: false, error: err.errors });
            return;
        }
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.createClaim = createClaim;
const listClaims = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        const { status, dateFrom, dateTo, page = '1', limit = '20' } = req.query;
        const result = await service.listClaims(pharmacyId, { status: status, dateFrom: dateFrom ? new Date(dateFrom) : undefined, dateTo: dateTo ? new Date(dateTo) : undefined }, { page: parseInt(page), limit: parseInt(limit) });
        res.json({ success: true, ...result });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.listClaims = listClaims;
const getClaim = async (req, res) => {
    try {
        const { id } = req.params;
        const pharmacyId = req.user.pharmacyId;
        const claim = await service.getClaim(id, pharmacyId);
        if (!claim) {
            res.status(404).json({ success: false, error: 'Claim not found' });
            return;
        }
        res.json({ success: true, data: claim });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.getClaim = getClaim;
const updateClaim = async (req, res) => {
    try {
        const { id } = req.params;
        const pharmacyId = req.user.pharmacyId;
        const claim = await service.updateClaim(id, pharmacyId, req.body);
        res.json({ success: true, data: claim });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.updateClaim = updateClaim;
const scrubClaim = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await service.scrubClaim(id);
        res.json({ success: true, data: result });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.scrubClaim = scrubClaim;
const submitBatch = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        const { claimIds } = submitBatchSchema.parse(req.body);
        const batch = await service.submitBatch(pharmacyId, claimIds);
        res.status(201).json({ success: true, data: batch });
    }
    catch (err) {
        if (err.name === 'ZodError') {
            res.status(400).json({ success: false, error: err.errors });
            return;
        }
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.submitBatch = submitBatch;
const getBatchStatus = async (req, res) => {
    try {
        const { ref } = req.params;
        const status = await service.getBatchStatus(ref);
        res.json({ success: true, data: status });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.getBatchStatus = getBatchStatus;
const generateVfdReceipt = async (req, res) => {
    try {
        const { dispensingEventId } = req.body;
        if (!dispensingEventId) {
            res.status(400).json({ success: false, error: 'dispensingEventId required' });
            return;
        }
        const result = await service.generateVfdReceipt(dispensingEventId);
        res.json({ success: true, data: result });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.generateVfdReceipt = generateVfdReceipt;
const getAnalytics = async (req, res) => {
    try {
        const pharmacyId = req.user.pharmacyId;
        const { dateFrom, dateTo } = req.query;
        const result = await service.getAnalytics(pharmacyId, {
            from: dateFrom ? new Date(dateFrom) : new Date(new Date().setDate(1)),
            to: dateTo ? new Date(dateTo) : new Date(),
        });
        res.json({ success: true, data: result });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.getAnalytics = getAnalytics;
//# sourceMappingURL=nhif.controller.js.map